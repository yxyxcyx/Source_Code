interface LoginUser {
  username: string;
  password: string;
  department: string;
  display_name: string;
}

const MockLogin: LoginUser[] = [
  { username: 'risk', password: '1234', department: 'Risk Management', display_name: 'Risk Management User' },
  { username: 'did', password: '1234', department: 'Data & Innovation', display_name: 'Data & Innovation User' }
];

export default MockLogin;