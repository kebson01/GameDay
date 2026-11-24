// Shared data in Supabase: tailgates, groups and live locations.
// These adapters keep the same Promise API as the on-device entities
// (list / get / create / update / delete / filter) so pages work unchanged,
// plus a few server-checked actions (rsvp, join, updateChecklist).
// Access rules are enforced by row-level security in the database.

import { supabase } from './supabase';
import { getItem } from './localStorage';

const currentUser = () => getItem('gameday_auth', null);

function must(result) {
  if (result.error) {
    const msg = result.error.message || 'Something went wrong';
    throw new Error(msg.replace(/^.*?: /, ''));
  }
  return result.data;
}

const withDates = (row) =>
  row ? { ...row, created_date: row.created_at, updated_date: row.updated_at || row.created_at } : row;

function applySort(query, sortBy) {
  if (!sortBy) return query;
  const desc = sortBy.startsWith('-');
  const field = (desc ? sortBy.slice(1) : sortBy).replace('created_date', 'created_at').replace('updated_date', 'updated_at');
  return query.order(field, { ascending: !desc });
}

// Equality filters the database understands; anything else is applied here
function splitConditions(conditions, serverKeys) {
  const server = {};
  const client = {};
  for (const [k, v] of Object.entries(conditions || {})) (serverKeys.includes(k) ? server : client)[k] = v;
  return { server, client };
}
const matchesAll = (row, conds) => Object.entries(conds).every(([k, v]) => row?.[k] === v);

// ---------------------------------------------------------------------------
// Tailgates
// ---------------------------------------------------------------------------
const TAILGATE_COLUMNS = [
  'host_name', 'name', 'description', 'type', 'game_date', 'start_time', 'end_time', 'location',
  'is_public', 'capacity', 'amenities', 'checklist', 'photo_url',
];
const pickTailgate = (data) =>
  Object.fromEntries(Object.entries(data).filter(([k, v]) => TAILGATE_COLUMNS.includes(k) && v !== undefined));

async function getTailgate(id) {
  if (!id) return null;
  const rows = must(await supabase.rpc('get_tailgate', { p_id: id }));
  return withDates(rows?.[0] || null);
}

export const Tailgate = {
  list: async () => must(await supabase.from('tailgates').select('*').order('game_date')).map(withDates),

  get: getTailgate,

  filter: async (conditions = {}, sortBy = null, limit = null) => {
    if (conditions.id) {
      const t = await getTailgate(conditions.id);
      return t && matchesAll(t, { ...conditions, id: t.id }) ? [t] : [];
    }
    const { server, client } = splitConditions(conditions, ['is_public', 'game_date', 'host_id', 'type']);
    let q = supabase.from('tailgates').select('*').match(server);
    q = applySort(q, sortBy);
    if (limit && !Object.keys(client).length) q = q.limit(limit);
    let rows = must(await q).map(withDates).filter(r => matchesAll(r, client));
    if (limit) rows = rows.slice(0, limit);
    return rows;
  },

  create: async (data) => {
    const user = currentUser();
    if (!user?.cloud) throw new Error('Sign in to host a tailgate');
    const row = must(
      await supabase
        .from('tailgates')
        .insert({ ...pickTailgate(data), host_id: user.id, host_name: data.host_name || user.full_name })
        .select()
        .single()
    );
    if (!row.is_public && data.password) {
      must(await supabase.from('tailgate_secrets').insert({ tailgate_id: row.id, passcode_hash: data.password }));
    }
    return withDates(row);
  },

  // Host edits. RSVP counts and checklists use rsvp()/updateChecklist().
  update: async (id, data) => {
    if ('checklist' in data && Object.keys(data).length === 1) return Tailgate.updateChecklist(id, data.checklist);
    const fields = pickTailgate(data);
    delete fields.checklist;
    if (!Object.keys(fields).length) return getTailgate(id);
    return withDates(must(await supabase.from('tailgates').update(fields).eq('id', id).select().single()));
  },

  delete: async (id) => {
    must(await supabase.from('tailgates').delete().eq('id', id));
    return true;
  },

  // Server checks sign-in, passcode (private tailgates) and capacity
  rsvp: async (id, passcode) => {
    const count = must(await supabase.rpc('rsvp_tailgate', { p_id: id, p_passcode: passcode || null }));
    return { id, rsvp_count: count };
  },

  cancelRsvp: async (id) => {
    const user = currentUser();
    must(await supabase.from('tailgate_rsvps').delete().eq('tailgate_id', id).eq('user_id', user?.id));
    return true;
  },

  isAttending: async (id) => {
    const user = currentUser();
    if (!user?.cloud) return false;
    const rows = must(await supabase.from('tailgate_rsvps').select('tailgate_id').eq('tailgate_id', id).eq('user_id', user.id));
    return rows.length > 0;
  },

  updateChecklist: async (id, checklist) => {
    must(await supabase.rpc('update_tailgate_checklist', { p_id: id, p_checklist: checklist }));
    return getTailgate(id);
  },
};

// ---------------------------------------------------------------------------
// Groups (members are a separate table; returned as group.members)
// ---------------------------------------------------------------------------
const GROUP_SELECT = '*, group_members(user_id, email, display_name, role, location_sharing, joined_at)';
const toGroup = (row) => {
  if (!row) return row;
  const { group_members: members = [], ...rest } = row;
  return withDates({ ...rest, members });
};

async function getGroup(id) {
  const row = must(await supabase.from('groups').select(GROUP_SELECT).eq('id', id).maybeSingle());
  return toGroup(row);
}

export const TailgateGroup = {
  // Only groups you belong to are visible
  list: async () => must(await supabase.from('groups').select(GROUP_SELECT).order('created_at')).map(toGroup),

  get: getGroup,

  filter: async (conditions = {}, sortBy = null, limit = null) => {
    const { 'members.email': _memberEmail, ...rest } = conditions || {};
    let rows = (await TailgateGroup.list()).filter(g => matchesAll(g, rest));
    if (sortBy?.replace('-', '') === 'created_date') rows.sort((a, b) => (a.created_date < b.created_date ? -1 : 1) * (sortBy.startsWith('-') ? -1 : 1));
    if (limit) rows = rows.slice(0, limit);
    return rows;
  },

  // Invite code and the owner's membership are created by the database
  create: async (data) => {
    const user = currentUser();
    if (!user?.cloud) throw new Error('Sign in to create a group');
    const row = must(
      await supabase
        .from('groups')
        .insert({ owner_id: user.id, name: data.name, avatar_emoji: data.avatar_emoji || '🏈', color: data.color || '#FF6B35' })
        .select('id')
        .single()
    );
    return getGroup(row.id);
  },

  update: async (id, data) => {
    const fields = {};
    for (const k of ['name', 'avatar_emoji', 'color']) if (k in data) fields[k] = data[k];
    if (Object.keys(fields).length) must(await supabase.from('groups').update(fields).eq('id', id));
    return getGroup(id);
  },

  delete: async (id) => {
    must(await supabase.from('groups').delete().eq('id', id));
    return true;
  },

  join: async (code) => {
    const id = must(await supabase.rpc('join_group', { p_code: code }));
    return getGroup(id);
  },

  leave: async (id) => {
    const user = currentUser();
    must(await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', user?.id));
    return true;
  },

  setLocationSharing: async (id, sharing) => {
    const user = currentUser();
    must(await supabase.from('group_members').update({ location_sharing: sharing }).eq('group_id', id).eq('user_id', user?.id));
    return getGroup(id);
  },
};

// ---------------------------------------------------------------------------
// Live locations: you see your own, plus group-mates who are sharing
// ---------------------------------------------------------------------------
const toLocation = (row) => (row ? { ...row, id: row.user_id } : row);
const LOCATION_COLUMNS = ['email', 'display_name', 'lat', 'lng', 'accuracy', 'sharing_enabled', 'status', 'last_updated'];

async function upsertOwnLocation(data) {
  const user = currentUser();
  if (!user?.cloud) throw new Error('Sign in to share your location');
  const row = { user_id: user.id, email: user.email, display_name: user.full_name };
  for (const k of LOCATION_COLUMNS) if (data[k] !== undefined) row[k] = data[k];
  row.last_updated = new Date().toISOString();
  return toLocation(must(await supabase.from('user_locations').upsert(row, { onConflict: 'user_id' }).select().single()));
}

export const UserLocation = {
  list: async () => must(await supabase.from('user_locations').select('*')).map(toLocation),
  get: async (id) => toLocation(must(await supabase.from('user_locations').select('*').eq('user_id', id).maybeSingle())),
  filter: async (conditions = {}) => {
    const { server, client } = splitConditions(conditions, ['user_id', 'sharing_enabled', 'email']);
    return must(await supabase.from('user_locations').select('*').match(server)).map(toLocation).filter(r => matchesAll(r, client));
  },
  create: (data) => upsertOwnLocation(data),
  update: (_id, data) => upsertOwnLocation(data),
  delete: async () => {
    const user = currentUser();
    must(await supabase.from('user_locations').delete().eq('user_id', user?.id));
    return true;
  },
};

// ---------------------------------------------------------------------------
// Photo uploads (tailgate covers) -> public "uploads" bucket, own folder
// ---------------------------------------------------------------------------
export async function uploadPhoto(file) {
  const user = currentUser();
  if (!user?.cloud) throw new Error('Sign in to upload photos');
  const ext = (file.name?.split('.').pop() || file.type?.split('/')[1] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${user.id}/${crypto.randomUUID()}.${ext || 'jpg'}`;
  must(await supabase.storage.from('uploads').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false }));
  return supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Team chat: posts, likes, comments, reports (shared between all fans)
// Author names come from profiles (set by the database). Likes and reports
// are private rows; posts carry the counts. Emails are never exposed.
// ---------------------------------------------------------------------------
const POST_COLUMNS = ['team_name', 'content', 'type', 'news_url', 'news_title', 'video_url'];

async function decoratePosts(rows) {
  const user = currentUser();
  const ids = rows.map(r => r.id);
  let liked = new Set();
  let reported = new Set();
  if (user?.cloud && ids.length) {
    const [likes, reports] = await Promise.all([
      supabase.from('team_post_likes').select('post_id').in('post_id', ids),
      supabase.from('team_post_reports').select('post_id').in('post_id', ids),
    ]);
    liked = new Set((likes.data || []).map(r => r.post_id));
    reported = new Set((reports.data || []).map(r => r.post_id));
  }
  const isAdmin = user?.role === 'admin';
  return rows.map(r => {
    const own = user?.cloud && r.user_id === user.id;
    return {
      ...withDates(r),
      user_email: own ? user.email : null, // others' emails are private
      is_own: own,
      liked_by_me: liked.has(r.id),
      // Moderators see any reported post as flagged; others see their own report
      is_flagged: isAdmin ? r.report_count > 0 : reported.has(r.id),
    };
  });
}

export const TeamPost = {
  list: async () => decoratePosts(must(await supabase.from('team_posts').select('*').order('created_at', { ascending: false }).limit(100))),

  get: async (id) => (await decoratePosts(must(await supabase.from('team_posts').select('*').eq('id', id))))[0] || null,

  filter: async (conditions = {}, sortBy = '-created_date', limit = 50) => {
    const user = currentUser();
    const { user_email: email, ...rest } = conditions || {};
    let q = supabase.from('team_posts').select('*');
    if (rest.team_name) q = q.eq('team_name', rest.team_name);
    if (email) {
      // Only your own posts can be looked up by email
      if (!user?.cloud || email.toLowerCase() !== user.email?.toLowerCase()) return [];
      q = q.eq('user_id', user.id);
    }
    q = applySort(q, sortBy || '-created_date');
    if (limit) q = q.limit(limit);
    return decoratePosts(must(await q));
  },

  create: async (data) => {
    const fields = Object.fromEntries(Object.entries(data).filter(([k, v]) => POST_COLUMNS.includes(k) && v !== undefined && v !== ''));
    const row = must(await supabase.from('team_posts').insert(fields).select().single());
    return (await decoratePosts([row]))[0];
  },

  // Map the feed's existing update() calls onto server-checked actions
  update: async (id, data) => {
    if ('is_hidden' in data || (data.is_flagged === false && currentUser()?.role === 'admin')) {
      must(await supabase.rpc('moderate_post', { p_id: id, p_hidden: Boolean(data.is_hidden) }));
    } else if (data.is_flagged === true) {
      await TeamPost.report(id);
    } else {
      const fields = {};
      for (const k of ['content', 'news_url', 'news_title']) if (k in data) fields[k] = data[k];
      if (Object.keys(fields).length) must(await supabase.from('team_posts').update(fields).eq('id', id));
    }
    return TeamPost.get(id);
  },

  delete: async (id) => {
    must(await supabase.from('team_posts').delete().eq('id', id));
    return true;
  },

  toggleLike: async (post) => {
    const user = currentUser();
    if (!user?.cloud) throw new Error('Sign in to like posts');
    if (post.liked_by_me) {
      must(await supabase.from('team_post_likes').delete().eq('post_id', post.id).eq('user_id', user.id));
    } else {
      const res = await supabase.from('team_post_likes').insert({ post_id: post.id });
      if (res.error && res.error.code !== '23505') must(res); // ignore "already liked"
    }
    return true;
  },

  report: async (id) => {
    const res = await supabase.from('team_post_reports').insert({ post_id: id });
    if (res.error && res.error.code !== '23505') must(res); // already reported
    return true;
  },
};

export const TeamComment = {
  filter: async (conditions = {}, sortBy = 'created_date', limit = 100) => {
    let q = supabase.from('team_comments').select('*');
    if (conditions.post_id) q = q.eq('post_id', conditions.post_id);
    q = applySort(q, sortBy || 'created_date');
    if (limit) q = q.limit(limit);
    const user = currentUser();
    return must(await q).map(r => ({ ...withDates(r), is_own: Boolean(user?.cloud && r.user_id === user.id) }));
  },
  list: async () => TeamComment.filter({}),
  get: async (id) => withDates(must(await supabase.from('team_comments').select('*').eq('id', id).maybeSingle())),
  create: async (data) => withDates(must(await supabase.from('team_comments').insert({ post_id: data.post_id, content: data.content }).select().single())),
  update: async (id) => TeamComment.get(id),
  delete: async (id) => {
    must(await supabase.from('team_comments').delete().eq('id', id));
    return true;
  },
};
