import ScheduleBoard from "../components/ScheduleBoard";

type HomePageProps = {
  onOpenSidebar: () => void;
  canManage: boolean;
};

function HomePage({ onOpenSidebar, canManage }: HomePageProps) {
  return <ScheduleBoard onOpenSidebar={onOpenSidebar} canManage={canManage} />;
}

export default HomePage;
