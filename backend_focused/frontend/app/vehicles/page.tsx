import { Suspense } from 'react';
import VehiclesScreen from '@/components/vehicles-screen';
import { Loading } from '@/components/common';
export default function VehiclesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <VehiclesScreen />
    </Suspense>
  );
}
