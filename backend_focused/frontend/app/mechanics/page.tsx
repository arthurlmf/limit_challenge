import { Suspense } from 'react';
import MechanicsScreen from '@/components/mechanics-screen';
import { Loading } from '@/components/common';
export default function MechanicsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MechanicsScreen />
    </Suspense>
  );
}
