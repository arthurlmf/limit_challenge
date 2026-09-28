import { Suspense } from 'react';
import VehicleDetailScreen from '@/components/vehicle-detail';
import { Loading } from '@/components/common';
export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <VehicleDetailScreen id={id} />
    </Suspense>
  );
}
