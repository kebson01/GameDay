import React from 'react';
import { cn } from '@/lib/utils';

// Base skeleton component
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200", className)}
      {...props}
    />
  );
}

// Card skeleton
export function CardSkeleton({ className }) {
  return (
    <div className={cn("bg-white rounded-2xl p-4 shadow-sm", className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-xl mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

// List item skeleton
export function ListItemSkeleton({ className }) {
  return (
    <div className={cn("flex items-center gap-3 p-3 bg-white rounded-xl", className)}>
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-20 h-8 rounded-full" />
    </div>
  );
}

// Game card skeleton
export function GameCardSkeleton({ className }) {
  return (
    <div className={cn("bg-white rounded-2xl p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    </div>
  );
}

// Tailgate card skeleton
export function TailgateCardSkeleton({ className }) {
  return (
    <div className={cn("bg-white rounded-2xl shadow-md overflow-hidden", className)}>
      <Skeleton className="w-full h-44" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="w-16 h-4" />
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <Skeleton className="w-8 h-8 rounded-full border-2 border-white" />
              <Skeleton className="w-8 h-8 rounded-full border-2 border-white" />
              <Skeleton className="w-8 h-8 rounded-full border-2 border-white" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="w-16 h-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Map skeleton
export function MapSkeleton({ className }) {
  return (
    <div className={cn("rounded-2xl overflow-hidden bg-slate-200 relative", className)}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading map...</p>
        </div>
      </div>
    </div>
  );
}

// Profile header skeleton
export function ProfileHeaderSkeleton({ className }) {
  return (
    <div className={cn("text-center", className)}>
      <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
      <Skeleton className="h-6 w-32 mx-auto mb-2" />
      <Skeleton className="h-4 w-48 mx-auto mb-4" />
      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      </div>
    </div>
  );
}

// Stories/Groups skeleton (horizontal scroll)
export function StoriesSkeleton({ count = 5 }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 shrink-0">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

// Quick actions skeleton
export function QuickActionsSkeleton() {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-100">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="h-2 w-10" />
        </div>
      ))}
    </div>
  );
}

// Full page loading skeleton for Home
export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-200 px-4 pt-12 pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-28" />
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="w-6 h-6 rounded-full" />
          </div>
        </div>
      </div>

      {/* Stories skeleton */}
      <div className="px-4 py-4 border-b border-gray-100">
        <StoriesSkeleton />
      </div>

      {/* Quick actions skeleton */}
      <div className="px-4 py-3">
        <QuickActionsSkeleton />
      </div>

      {/* Hero card skeleton */}
      <div className="mx-4 mb-4">
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>

      {/* Content skeleton */}
      <div className="px-4 space-y-6 pb-24">
        <section>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <TailgateCardSkeleton />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-3">
            <GameCardSkeleton />
            <GameCardSkeleton />
          </div>
        </section>
      </div>
    </div>
  );
}

export default Skeleton;


