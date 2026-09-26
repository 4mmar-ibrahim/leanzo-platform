'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ServiceDetailView } from '@/components/services/ServiceDetailView';

export default function CarServiceDetailPage() {
  const params = useParams();
  const serviceId = params?.serviceId as string;

  return <ServiceDetailView serviceId={serviceId} expectedCategory="car" />;
}
