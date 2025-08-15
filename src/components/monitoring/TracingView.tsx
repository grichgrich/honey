import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface TracingData {
  id: string;
  duration: number;
  status: 'success' | 'error';
  timestamp: string;
}

interface TracingViewProps {
  data: TracingData[];
}

const TracingView: React.FC<TracingViewProps> = ({ data }) => {
  return (
    <div className="w-full h-96 bg-gray-900 rounded-lg p-4">
      <BarChart
        width={800}
        height={400}
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="duration"
          fill="#3b82f6"
          fillOpacity={0.8}
          stroke={data.map(item => item.status === 'error' ? '#ef4444' : '#3b82f6')}
          strokeWidth={2}
        />
      </BarChart>
    </div>
  );
};

export default TracingView;