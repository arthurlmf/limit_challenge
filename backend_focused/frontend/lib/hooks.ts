'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { fleetApi } from './fleet-api';

export function useOffices() {
  return useQuery({
    queryKey: ['fleet', 'office-options'],
    queryFn: ({ signal }) => fleetApi.officeOptions(signal),
  });
}
export function useMechanics() {
  return useQuery({
    queryKey: ['fleet', 'mechanic-options'],
    queryFn: ({ signal }) => fleetApi.mechanicOptions(signal),
  });
}
export function useFleetMutation<T = void>(
  mutationFn: (variables: T) => Promise<unknown>,
  onSuccess: () => void,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      // A write can affect filtered vehicles, nested history, labels and the due report.
      await client.invalidateQueries({ queryKey: ['fleet'] });
      onSuccess();
    },
  });
}
export function useUrlPage() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const raw = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(raw) && raw > 0 ? raw : 1;
  const setPage = (value: number) => {
    const next = new URLSearchParams(params.toString());
    if (value === 1) next.delete('page');
    else next.set('page', String(value));
    router.push(`${path}?${next}`, { scroll: false });
  };
  return { page, setPage };
}
