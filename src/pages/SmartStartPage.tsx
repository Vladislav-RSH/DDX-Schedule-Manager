import SmartStartBoard from '../components/SmartStartBoard';

type SmartStartPageProps = {
  onOpenSidebar: () => void;
  canManage: boolean;
};

function SmartStartPage({ onOpenSidebar, canManage }: SmartStartPageProps) {
  return <SmartStartBoard onOpenSidebar={onOpenSidebar} canManage={canManage} />;
}

export default SmartStartPage;
