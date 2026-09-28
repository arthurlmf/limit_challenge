import { Suspense } from 'react';
import OfficesScreen from '@/components/offices-screen';
import { Loading } from '@/components/common';
export default function OfficesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OfficesScreen />
    </Suspense>
  );
}
