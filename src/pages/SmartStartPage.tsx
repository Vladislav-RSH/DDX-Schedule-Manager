import SmartStartBoard from '../components/SmartStartBoard';

type SmartStartPageProps = {
  onOpenSidebar: () => void;
};

function SmartStartPage({ onOpenSidebar }: SmartStartPageProps) {
  return <SmartStartBoard onOpenSidebar={onOpenSidebar} />;
}

export default SmartStartPage;
