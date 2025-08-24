import QuickChart from 'quickchart-js';

/**
 * Chart generation utilities for creating pie charts and other visualizations
 */

const CATEGORY_COLORS = {
  groceries: '#10B981',   // Green
  dining: '#F59E0B',      // Amber
  gas: '#3B82F6',         // Blue
  pharmacy: '#8B5CF6',    // Purple
  retail: '#EC4899',      // Pink
  services: '#F97316',    // Orange
  other: '#6B7280'        // Gray
};

/**
 * Generate pie chart URL for category breakdown
 * @param {Array} categories - Array of {category, amount, percentage} objects
 * @param {string} title - Chart title
 * @returns {string} - Chart URL
 */
export function generateCategoryPieChart(categories, title = 'Category Breakdown') {
  if (!categories || categories.length === 0) {
    return null;
  }

  const chart = new QuickChart();
  
  const labels = categories.map(cat => `${getCategoryEmoji(cat.category)} ${capitalizeFirst(cat.category)}`);
  const data = categories.map(cat => cat.amount);
  const colors = categories.map(cat => CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.other);

  chart.setConfig({
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#FFFFFF'
      }]
    },
    options: {
      title: {
        display: true,
        text: title,
        fontSize: 16,
        fontColor: '#1F2937'
      },
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          fontSize: 12,
          fontColor: '#1F2937',
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map(function(label, i) {
                const amount = data.datasets[0].data[i];
                const percentage = categories[i].percentage;
                return {
                  text: `${label}: $${amount.toFixed(2)} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      plugins: {
        datalabels: {
          display: true,
          color: '#FFFFFF',
          font: {
            weight: 'bold',
            size: 12
          },
          formatter: function(value, context) {
            const percentage = categories[context.dataIndex].percentage;
            return percentage > 5 ? `${percentage}%` : ''; // Only show if > 5%
          }
        }
      },
      responsive: false,
      maintainAspectRatio: false
    }
  });

  chart.setWidth(500);
  chart.setHeight(400);
  chart.setBackgroundColor('#FFFFFF');

  return chart.getUrl();
}

/**
 * Get category emoji
 * @param {string} category - Category name
 * @returns {string} - Emoji
 */
function getCategoryEmoji(category) {
  const emojis = {
    groceries: '🛒',
    dining: '🍽️',
    gas: '⛽',
    pharmacy: '💊',
    retail: '🛍️',
    services: '🔧',
    other: '📦'
  };
  return emojis[category] || '📦';
}

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}