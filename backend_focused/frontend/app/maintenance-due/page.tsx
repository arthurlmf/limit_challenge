import { Suspense } from 'react';
import DueScreen from '@/components/due-screen';
import { Loading } from '@/components/common';
export default function DuePage() {
  return (
    <Suspense fallback={<Loading />}>
      <DueScreen />
    </Suspense>
  );
}
