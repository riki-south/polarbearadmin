import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Sidebar } from "./components/Sidebar";
import { AdminView } from "./features/fan-growth/AdminView";
import { GeneralView } from "./features/fan-growth/GeneralView";
import { HomeView } from "./features/home/HomeView";
import { getCategoryTitle } from "./features/fan-growth/fanGrowthUtils";
import { getStoredAdminState } from "./lib/admin";
import type { AppSection, FanGrowthCategory } from "./lib/types";

function pageFromPath(path: string): AppSection {
  if (path === "/south") return "south";
  if (path === "/north") return "north";
  if (path === "/admin") return "admin";
  return "home";
}

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>(() => pageFromPath(window.location.pathname));
  const [dataVersion, setDataVersion] = useState(0);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => getStoredAdminState());
  const category: FanGrowthCategory = activeSection === "north" ? "north-monthly" : "south-monthly";
  const heading = activeSection === "home"
    ? "월간 성장 TOP 3"
    : activeSection === "admin"
      ? "관리자"
      : getCategoryTitle(category);

  useEffect(() => {
    const handlePopState = () => setActiveSection(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(page: AppSection) {
    const path = page === "home" ? "/" : `/${page}`;
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setActiveSection(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Layout
      heading={heading}
      sidebar={<Sidebar activeSection={activeSection} isAdminUnlocked={isAdminUnlocked} onNavigate={navigate} />}
    >
      {activeSection === "home" ? (
        <HomeView dataVersion={dataVersion} onOpen={navigate} />
      ) : activeSection === "admin" ? (
        <AdminView
          dataVersion={dataVersion}
          onAdminAccessChange={setIsAdminUnlocked}
          onDatasetUpdated={() => setDataVersion((value) => value + 1)}
        />
      ) : (
        <GeneralView key={category} category={category} dataVersion={dataVersion} />
      )}
    </Layout>
  );
}
