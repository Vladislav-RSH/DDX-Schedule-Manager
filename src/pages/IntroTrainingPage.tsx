import IntroTrainingBoard from '../components/IntroTrainingBoard';

type IntroTrainingPageProps = {
  onOpenSidebar: () => void;
  canManage: boolean;
};

function IntroTrainingPage({ onOpenSidebar, canManage }: IntroTrainingPageProps) {
  return <IntroTrainingBoard onOpenSidebar={onOpenSidebar} canManage={canManage} />;
}

export default IntroTrainingPage;
