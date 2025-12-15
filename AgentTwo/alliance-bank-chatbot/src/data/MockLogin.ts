interface LoginUser {
  username: string;
  password: string;
  department: string;
  display_name: string;
}

const MockLogin: LoginUser[] = [
  { username: 'risk', password: '1234', department: 'Risk Management', display_name: 'Risk Management User' },
  { username: 'did', password: '1234', department: 'Data & Innovation', display_name: 'Data & Innovation User' },
  { username: 'db', password: '1234', department: 'Digital Banking / Compliance', display_name: 'Digital Banking / Compliance User' },
  { username: 'prudential', password: '1234', department: 'Prudential', display_name: 'Prudential User'  },
  { username: 'climate', password: '1234', department: 'Climate / Risk', display_name: 'Climate / Risk User'  },  
  { username: 'pdigital', password: '1234', department: 'Payment / Digital', display_name: 'Payment / Digital User'  },
  { username: 'islambank', password: '1234', department: 'Islamic Banking / Shariah', display_name: 'Islamic Banking / Shariah User'  },
  { username: 'governance', password: '1234', department: 'Governance / Cooperate', display_name: 'Governance / Cooperate User'  },
  { username: 'pdpa', password: '1234', department: 'Legislation', display_name: 'Legislation User'  },
  { username: 'gdtgpt', password: '1234', department: 'Group Digital Transformation/Innovation', display_name: 'Group Digital Transformation/Innovation User' }, 
  { username: 'pilot', password: '1234', department: 'Pilot Test', display_name: 'Pilot Test User' },
];

export default MockLogin;
