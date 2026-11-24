import Layout from "./Layout.jsx";

import Home from "./Home";
import FindFriends from "./FindFriends";
import CarLocator from "./CarLocator";
import TailgateDirectory from "./TailgateDirectory";
import CreateTailgate from "./CreateTailgate";
import CampusMap from "./CampusMap";
import TailgateDetail from "./TailgateDetail";
import Schedule from "./Schedule";
import Settings from "./Settings";
import Standings from "./Standings";
import GameDay from "./GameDay";
import News from "./News";
import MyTeams from "./MyTeams";
import TeamSocial from "./TeamSocial";
import TeamPage from "./TeamPage";
import DiscoverTeams from "./DiscoverTeams";
import LiveGame from "./LiveGame";
import UserProfile from "./UserProfile";
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Home: Home,
    FindFriends: FindFriends,
    CarLocator: CarLocator,
    TailgateDirectory: TailgateDirectory,
    CreateTailgate: CreateTailgate,
    CampusMap: CampusMap,
    TailgateDetail: TailgateDetail,
    Schedule: Schedule,
    Settings: Settings,
    Standings: Standings,
    GameDay: GameDay,
    News: News,
    MyTeams: MyTeams,
    TeamSocial: TeamSocial,
    TeamPage: TeamPage,
    DiscoverTeams: DiscoverTeams,
    LiveGame: LiveGame,
    UserProfile: UserProfile,
    PrivacyPolicy: PrivacyPolicy,
    TermsOfService: TermsOfService,
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    // Pages that should not show the navigation
    const noLayoutPages = ['PrivacyPolicy', 'TermsOfService'];
    const showLayout = !noLayoutPages.includes(currentPage);
    
    const content = (
            <Routes>            
                    <Route path="/" element={<Home />} />
                <Route path="/Home" element={<Home />} />
                <Route path="/FindFriends" element={<FindFriends />} />
                <Route path="/CarLocator" element={<CarLocator />} />
                <Route path="/TailgateDirectory" element={<TailgateDirectory />} />
                <Route path="/CreateTailgate" element={<CreateTailgate />} />
                <Route path="/CampusMap" element={<CampusMap />} />
                <Route path="/TailgateDetail" element={<TailgateDetail />} />
                <Route path="/Schedule" element={<Schedule />} />
                <Route path="/Settings" element={<Settings />} />
                <Route path="/Standings" element={<Standings />} />
                <Route path="/GameDay" element={<GameDay />} />
                <Route path="/News" element={<News />} />
                <Route path="/MyTeams" element={<MyTeams />} />
                <Route path="/TeamSocial" element={<TeamSocial />} />
                <Route path="/TeamPage" element={<TeamPage />} />
                <Route path="/DiscoverTeams" element={<DiscoverTeams />} />
                <Route path="/LiveGame" element={<LiveGame />} />
                <Route path="/UserProfile" element={<UserProfile />} />
            <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
            <Route path="/TermsOfService" element={<TermsOfService />} />
        </Routes>
    );
                
    if (showLayout) {
        return (
            <Layout currentPageName={currentPage}>
                {content}
        </Layout>
    );
    }

    return content;
}

export default function Pages() {
    return (
        <Router basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
            <PagesContent />
        </Router>
    );
}
