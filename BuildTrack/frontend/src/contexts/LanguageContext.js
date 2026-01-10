import React, { createContext, useState, useContext, useEffect } from "react";

const translations = {
  en: {
    welcome: "Welcome to BuildTrack!",
    loginTitle: "Login",
    placeholderUsername: "Enter Email or Username",
    placeholderPassword: "Enter Password",
    fillFields: "Please fill in both fields.",
    loggingIn: "Logging in...",
    loginButton: "Login",
    invalidCredentials: "Invalid credentials. Please try again.",
    navDashboard: "Dashboard",
    navSitesTasks: "Sites & Tasks",
    navLabor: "Labor",
    navInventory: "Inventory",
    navCommunication: "Communication",
    navReports: "Reports",
    logout: "Logout",
    guest: "Guest",
    hello: "Hello",
    dashboardTitle: "BuildTrack Dashboard",
    recentActivities: "Recent Activities",
    activeSites: "Active Sites",
    pendingTasks: "Pending Tasks",
    workersStat: "Workers",
    reportsStat: "Reports",
    currentlyRunning: "Currently running",
    awaitingApproval: "Awaiting approval",
    onSiteToday: "On-site today",
    newThisWeek: "New this week",
    inventoryTitle: "Construction Inventory Management",
    addNewInventoryItem: "Add New Inventory Item",
    viewOnlyMode: "View Only Mode",
    laborTitle: "Labor & Manager Management",
    addUser: "Add New User",
    sitesTitle: "Sites & Tasks",
    addSite: "Add New Site",
      communicationTitle: "Communication",
      communicationHint: "Send messages and stay connected with your site team.",
      messagePlaceholder: "Type your message...",
      send: "Send",
      reportsTitle: "Reports",
  },
  ta: {
    welcome: "BuildTrack-இல் வரவேற்பு!",
    loginTitle: "உள்நுழைய",
    placeholderUsername: "மின்னஞ்சல் அல்லது பயனர் பெயரை உள்ளிடவும்",
    placeholderPassword: "கடவுச்சொல்லை உள்ளிடவும்",
    fillFields: "இரு புலங்களையும் நிரப்பவும்.",
    loggingIn: "உள்நுழைகிறது...",
    loginButton: "உள்நுழை",
    invalidCredentials: "தவறான அங்கீகாரத் தகவல்கள். தயவுசெய்து மீண்டும் முயற்சி செய்க.",
    navDashboard: "ஊடாடல்",
    navSitesTasks: "இடங்கள் & பணிகள்",
    navLabor: "தொழிலாளர்கள்",
    navInventory: "சரக்குகள்",
    navCommunication: "தொடர்பு",
    navReports: "அறிக்கைகள்",
    logout: "வெளியேறு",
    guest: "அதிகாரமில்லாதவர்",
    hello: "வணக்கம்",
    dashboardTitle: "BuildTrack கட்டுப்பாட்டு பலகம்",
    recentActivities: "சமீபத்திய நடவடிக்கைகள்",
    activeSites: "செயல்பாட்டிலுள்ள தளங்கள்",
    pendingTasks: "எதிர்பார்க்கப்படும் பணிகள்",
    workersStat: "தொழிலாளர்கள்",
    reportsStat: "அறிக்கைகள்",
    currentlyRunning: "தற்போது இயங்குகிறது",
    awaitingApproval: "அனுமதிக்க வருகிறன",
    onSiteToday: "இன்று தளத்தில்",
    newThisWeek: "இந்த வாரத்தில் புதியவை",
    inventoryTitle: "கட்டுமான பொருள் மேலாண்மை",
    addNewInventoryItem: "புதிய பொருள் சேர்க்க",
    viewOnlyMode: "காட்சி மட்டுமே",
    laborTitle: "தொழிலாளர் & மேனேஜர் மேலாண்மை",
    addUser: "புதிய பயனரைச் சேர்க்க",
    sitesTitle: "இடங்கள் & பணிகள்",
    addSite: "புதிய தளத்தைச் சேர்க்க",
      communicationTitle: "தொடர்பு",
      communicationHint: "செய்திகளை அனுப்பி உங்கள் தள குழுவுடன் இணைந்திருங்கள்.",
      messagePlaceholder: "உங்கள் செய்தியை எழுதுக...",
      send: "அனுப்பு",
      reportsTitle: "அறிக்கைகள்",
  },
  si: {
    welcome: "BuildTrack වෙත සාදරයෙන් පිළිගනිමු!",
    loginTitle: "ඇතුල් වන්න",
    placeholderUsername: "ඊමේල් හෝ පරිශීලක නාමය ඇතුල් කරන්න",
    placeholderPassword: "මුරපදය ඇතුල් කරන්න",
    fillFields: "දෙකම ක්ෂේත්‍ර පුරවන්න.",
    loggingIn: "ඇතුල් වෙමින්...",
    loginButton: "ඇතුල් වන්න",
    invalidCredentials: "අවලංගු අදාළ තොරතුරු. කරුණාකර නැවත උත්සාහ කරන්න.",
    navDashboard: "පාලන පුවරුව",
    navSitesTasks: "ගොඩනැගිලි & කාර්ය",
    navLabor: "වේලු",
    navInventory: "ගබඩාව",
    navCommunication: "සන්නිවේදනය",
    navReports: "රিপෝර්ට්",
    logout: "ප්‍රතික්ෂේප කරන්න",
    guest: "ඔබ නොමැත",
    hello: "හෙලෝ",
    dashboardTitle: "BuildTrack Dashboard",
    recentActivities: "අවසන් කටයුතු",
    activeSites: "ක්‍රියාකාරී ස්ථාන",
    pendingTasks: "පෙනී සිටින කාර්ය",
    workersStat: "වැඩකරුවන්",
    reportsStat: "රිපෝර්ට්",
    currentlyRunning: "දැනට පවතිනවා",
    awaitingApproval: "අනුමතිය බලාපොරොත්තුවට පත්වී ඇත",
    onSiteToday: "අද සයිට් හි",
    newThisWeek: "මෙම සතියේ නව",
    inventoryTitle: "නිෂ්පාදන ගබඩා කළමනාකරණය",
    addNewInventoryItem: "නව වස්තුව එක් කරන්න",
    viewOnlyMode: "පෙනී සිටීම පමණි",
    laborTitle: "වැඩි හා කළමනාකරණය",
    addUser: "නව පරිශීලකයෙක් එක් කරන්න",
    sitesTitle: "අඩවි සහ කාර්ය",
    addSite: "නව ස්ථානයක් එක් කරන්න",
      communicationTitle: "සන්නිවේදනය",
      communicationHint: "පණිවිඩ යවා ඔබේ සයිට් කණ්ඩායම සමඟ සම්බන්ධව සිටින්න.",
      messagePlaceholder: "ඔබේ පණිවිඩය ටයිප් කරන්න...",
      send: "යවන්න",
      reportsTitle: "රිපෝර්ට්",
  },
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("appLang") || "en";
    } catch (e) {
      return "en";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("appLang", lang);
    } catch (e) {
      // ignore
    }
    // Set a body class so CSS can target the active language (e.g. .lang-ta)
    try {
      const cls = `lang-${lang}`;
      document.body.classList.remove("lang-en", "lang-ta", "lang-si");
      document.body.classList.add(cls);
    } catch (e) {
      // ignore (server-side rendering safety)
    }
  }, [lang]);

  const t = (key) => {
    return (
      (translations[lang] && translations[lang][key]) ||
      translations["en"][key] ||
      key
    );
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
