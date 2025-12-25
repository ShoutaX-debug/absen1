export const employees = [
  { id: '1', name: 'Sarah Chen', email: 'sarah.chen@example.com', password: 'password123' },
  { id: '2', name: 'David Lee', email: 'david.lee@example.com', password: 'password123' },
  { id: '3', name: 'Maria Garcia', email: 'maria.garcia@example.com', password: 'password123' },
  { id: '4', name: 'Kenji Tanaka', email: 'kenji.tanaka@example.com', password: 'password123' },
  { id: '5', name: 'Chloe Kim', email: 'chloe.kim@example.com', password: 'password123' },
];

export const attendanceRecords = [
  {
    employee_id: '1',
    check_in_time: new Date(new Date().setHours(8, 45, 0, 0)),
    status: 'Present',
    photo_url: 'https://picsum.photos/seed/att1/200/200',
    latitude: 34.0522,
    longitude: -118.2437,
  },
  {
    employee_id: '2',
    check_in_time: new Date(new Date().setHours(9, 15, 0, 0)),
    status: 'Late',
    photo_url: 'https://picsum.photos/seed/att2/200/200',
    latitude: 34.0522,
    longitude: -118.2437,
  },
  {
    employee_id: '3',
    check_in_time: new Date(new Date().setHours(8, 58, 0, 0)),
    status: 'Present',
    photo_url: 'https://picsum.photos/seed/att3/200/200',
    latitude: 34.0522,
    longitude: -118.2437,
  },
  {
    employee_id: '4',
    check_in_time: new Date(new Date().setHours(9, 5, 0, 0)),
    status: 'Late',
    photo_url: 'https://picsum.photos/seed/att4/200/200',
    latitude: 34.0522,
    longitude: -118.2437,
  },
];
