// Mock data for the Delivery Partner app

export const orders = [
  {
    id: 'ORD-8924A',
    status: 'Picked Up',
    statusStyle: 'active',
    items: 3,
    destination: '456 Oak Lane, Apt 4B',
    customer: 'Sarah M.',
    distance: '2.4 mi',
    eta: '15 min',
    payout: '$12.50',
    pickup: { label: 'Bistro Cafe Downtown', address: '124 Main Street' },
    dropoff: { label: 'Tech Campus Bldg 4', address: '400 Silicon Blvd' },
    duration: '15 min',
    // Earnings breakdown
    basePay: '$8.50',
    tip: '$4.00',
    bonus: '$0.00',
    completedAt: 'Just now',
    itemsCount: 3,
    itemsList: ['1x Grilled Chicken Bowl', '1x Iced Matcha Latte', '1x Garlic Bread'],
    deliveryNote: 'Left at front door (Customer requested no knocking)',
    rating: '5.0 ★',
  },
  {
    id: 'ORD-9012B',
    status: 'Ready',
    statusStyle: 'ready',
    items: 1,
    destination: '101 Cedar Blvd',
    customer: null,
    distance: '1.2 mi',
    eta: '8 min',
    payout: '$8.75',
    pickup: { label: 'Corner Bakery', address: '88 Elm Road' },
    dropoff: { label: 'Customer Residence', address: '101 Cedar Blvd' },
    duration: '8 min',
    basePay: '$7.25',
    tip: '$1.50',
    bonus: '$0.00',
    completedAt: 'Just now',
    itemsCount: 1,
    itemsList: ['1x Assorted Pastry Box'],
    deliveryNote: 'Hand to receptionist at front desk.',
    rating: '4.8 ★',
  },
  {
    id: 'ORD-8873C',
    status: 'Available',
    statusStyle: 'available',
    items: 5,
    destination: 'Maple & 5th Ave',
    customer: 'Derek P.',
    distance: '3.1 mi',
    eta: '20 min',
    payout: '$15.00',
    pickup: { label: 'Whole Foods Market', address: '220 Pine Street' },
    dropoff: { label: 'Apartment Complex', address: 'Maple & 5th Ave' },
    duration: '20 min',
    basePay: '$10.00',
    tip: '$5.00',
    bonus: '$0.00',
    completedAt: 'Just now',
    itemsCount: 5,
    itemsList: ['1x Fresh Produce Bag', '2x Organic Milk', '1x Sourdough Loaf', '1x Honey Jar'],
    deliveryNote: 'Call customer on arrival. Leave at door if no answer.',
    rating: '4.9 ★',
  },
]

// Recent activity shown on home
export const recentActivity = [
  {
    order: '#8892',
    time: '10:45 AM',
    miles: '2.4 miles',
    amount: '+$12.50',
    status: 'Delivered',
  },
  {
    order: '#8891',
    time: '09:30 AM',
    miles: '1.1 miles',
    amount: '+$8.00',
    status: 'Delivered',
  },
]

// Earnings history
export const deliveryHistory = [
  {
    name: 'Burger King',
    time: 'Today, 2:30 PM',
    amount: '+$12.50',
    tip: '+$3.00 tip',
    icon: 'restaurant',
    hasTip: true,
  },
  {
    name: "Luigi's Pizza",
    time: 'Today, 1:15 PM',
    amount: '+$18.20',
    tip: '+$5.00 tip',
    icon: 'local_pizza',
    hasTip: true,
  },
  {
    name: 'Starbucks',
    time: 'Today, 10:00 AM',
    amount: '+$6.80',
    tip: 'No tip',
    icon: 'coffee',
    hasTip: false,
  },
  {
    name: 'Whole Foods',
    time: 'Yesterday, 6:45 PM',
    amount: '+$24.00',
    tip: '+$8.00 tip',
    icon: 'local_grocery_store',
    hasTip: true,
  },
]

export const metrics = {
  totalEarnings: '$3,450',
  monthlyGoal: '85%',
  tips: '$420',
  tipsTrend: '+12% vs last week',
  deliveries: 142,
  deliveriesNote: 'Active 4 days this week',
  incentive: '$50 Bonus',
  incentiveNote: '8 trips to go',
  incentiveProgress: '60%',
}

// Bar chart heights for today's earnings card
export const earningsBars = [25, 50, 33, 75, 100, 20, 20]
