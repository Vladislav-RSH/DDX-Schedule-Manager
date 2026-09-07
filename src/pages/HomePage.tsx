import ScheduleBoard from "../components/ScheduleBoard";

type HomePageProps = {
  onOpenSidebar: () => void;
};

function HomePage({ onOpenSidebar }: HomePageProps) {
  return <ScheduleBoard onOpenSidebar={onOpenSidebar} />;
}

export default HomePage;
