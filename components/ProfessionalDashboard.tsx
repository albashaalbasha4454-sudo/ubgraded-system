import React from 'react';
import { Line, Bar } from 'react-chartjs-2';

const ProfessionalDashboard = () => {
    const salesData = {
        labels: ['January', 'February', 'March', 'April', 'May', 'June'],
        datasets: [{
            label: 'Sales',
            data: [65, 59, 80, 81, 56, 55],
            borderColor: 'rgba(75,192,192,1)',
            backgroundColor: 'rgba(75,192,192,0.2)',
            fill: true,
        }],
    };

    const financialData = {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
            label: 'Financial Overview',
            data: [3000, 4000, 3500, 4500],
            backgroundColor: ['rgba(255, 99, 132, 0.2)',
                             'rgba(54, 162, 235, 0.2)',
                             'rgba(255, 206, 86, 0.2)',
                             'rgba(75, 192, 192, 0.2)'],
        }],
    };

    return (
        <div>
            <h2>Sales Chart</h2>
            <Line data={salesData} />
            <h2>Financial Overview</h2>
            <Bar data={financialData} />
        </div>
    );
};

export default ProfessionalDashboard;