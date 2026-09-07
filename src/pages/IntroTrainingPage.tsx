import IntroTrainingBoard from '../components/IntroTrainingBoard';

type IntroTrainingPageProps = {
  onOpenSidebar: () => void;
};

function IntroTrainingPage({ onOpenSidebar }: IntroTrainingPageProps) {
  return <IntroTrainingBoard onOpenSidebar={onOpenSidebar} />;
}

export default IntroTrainingPage;
