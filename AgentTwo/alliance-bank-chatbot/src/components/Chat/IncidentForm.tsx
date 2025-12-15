import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

interface IncidentFormData {
  q1: string;
  q1a: boolean;
  q2: string;
  q3: string;
  q3a: string;
  q3b: string;
  q3c: string;
  q3d: string;
  q4: string;
}

interface IncidentFormProps {
  onSubmit: (formData: IncidentFormData) => void;
}

const FormContainer = styled.div`
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
`;

const SubmitButton = styled.button`
  background-color: #0056b3;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 20px;
  width: 100%;
  font-weight: 500;
  transition: background-color 0.2s;

  &:hover {
    background-color: #003d82;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const FormTitle = styled.h2`
  color: #0056b3;
  margin-bottom: 24px;
  text-align: center;
`;

const FormSection = styled.div`
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  border-left: 4px solid #0056b3;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  margin-top: 15px;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  label {
    margin: 0;
    cursor: pointer;
    color: #856404;
    font-weight: 500;
  }
`;

const IncidentForm: React.FC<IncidentFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<IncidentFormData>({
    q1: '',
    q1a: false,
    q2: '',
    q3: '',
    q3a: '',
    q3b: '',
    q3c: '',
    q3d: '',
    q4: ''
  });

  const [showQ3a, setShowQ3a] = useState(false);
  const [showQ3b, setShowQ3b] = useState(false);
  const [showQ3c, setShowQ3c] = useState(false);
  const [showQ3d, setShowQ3d] = useState(false);
  const [showQ1a, setShowQ1a] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    // Check if all mandatory fields are filled
    const isValid = 
      formData.q1.trim() !== '' &&
      formData.q2.trim() !== '' &&
      formData.q3.trim() !== '' &&
      formData.q4.trim() !== '' &&
      (formData.q3 !== 'Pending Checker approval' || 
       (formData.q3a.trim() !== '' && formData.q3b.trim() !== '' && 
        formData.q3c.trim() !== '' && formData.q3d.trim() !== '')) &&
      (!showQ1a || formData.q1a);
    
    setIsFormValid(isValid);
  }, [formData, showQ1a]);

  useEffect(() => {
    // Show/hide conditional questions based on Q3
    const showConditional = formData.q3 === 'Pending Checker approval' || 
                          formData.q3 === 'Pending/InProg Checker approval';
    
    setShowQ3a(showConditional);
    setShowQ3b(showConditional);
    setShowQ3c(showConditional);
    setShowQ3d(showConditional);

    // Reset conditional fields when hidden
    if (!showConditional) {
      setFormData(prev => ({
        ...prev,
        q3a: '',
        q3b: '',
        q3c: '',
        q3d: ''
      }));
    }
  }, [formData.q3]);

  useEffect(() => {
    // Show/hide checkbox based on Q1 selection
    const showCheckbox = formData.q1 === 'Error in Tablet - Native (Sdn Bhd/Sole Prop)' ||
                        formData.q1 === 'Error in Tablet - Joget (Partnership, LLP, PB, etc)';
    
    setShowQ1a(showCheckbox);

    // Reset checkbox when hidden
    if (!showCheckbox) {
      setFormData(prev => ({
        ...prev,
        q1a: false
      }));
    }
  }, [formData.q1]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onSubmit(formData);
    }
  };

  const formatFormData = (data: IncidentFormData) => {
    return `New Incident Report:
    Q1: What issue you're facing today: ${data.q1}
    ${showQ1a ? `Q1.a: Updated to latest version: ${data.q1a ? 'Yes' : 'No'}` : ''}
    Q2: What is your role: ${data.q2}
    Q3: What is your application status: ${data.q3}
    ${showQ3a ? `Q3.a: What is the NonIndividual CIF Status: ${data.q3a}` : ''}
    ${showQ3b ? `Q3.b: What is the NonIndividual Account Status: ${data.q3b}` : ''}
    ${showQ3c ? `Q3.c: What is the application BCA Status: ${data.q3c}` : ''}
    ${showQ3d ? `Q3.d: What is the application Bizsmart Status: ${data.q3d}` : ''}
    Q4: Please explain your error message/inquiry: ${data.q4}`;
  };

  return (
    <FormContainer>
      <FormTitle>Incident Report Form</FormTitle>
      <form onSubmit={handleSubmit}>
        <FormSection>
          <FormGroup>
            <Label>Q1: What issue you're facing today: (Mandatory)</Label>
            <Select 
              name="q1" 
              value={formData.q1} 
              onChange={handleChange}
              required
            >
              <option value="">-- Select an option --</option>
              <option value="Error in Tablet - Native (Sdn Bhd/Sole Prop)">Error in Tablet - Native (Sdn Bhd/Sole Prop)</option>
              <option value="Error in Tablet - Joget (Partnership, LLP, PB, etc)">Error in Tablet - Joget (Partnership, LLP, PB, etc)</option>
              <option value="Error in Webtracker">Error in Webtracker</option>
              <option value="General Inquiry on SOP or supported Product in DBOS NonIndi">General Inquiry on SOP or supported Product in DBOS NonIndi</option>
            </Select>
          </FormGroup>

          {showQ1a && (
            <CheckboxContainer>
              <input
                type="checkbox"
                id="q1a"
                name="q1a"
                checked={formData.q1a}
                onChange={handleCheckboxChange}
              />
              <label htmlFor="q1a">
                I confirm that I have updated to the latest version
              </label>
            </CheckboxContainer>
          )}
        </FormSection>

        <FormSection>
          <FormGroup>
            <Label>Q2: What is your role (Mandatory)</Label>
            <Select 
              name="q2" 
              value={formData.q2} 
              onChange={handleChange}
              required
            >
              <option value="">-- Select your role --</option>
              <option value="Maker">Maker</option>
              <option value="Checker">Checker</option>
              <option value="EDD Concurrer">EDD Concurrer</option>
              <option value="EDD Approver">EDD Approver</option>
            </Select>
          </FormGroup>
        </FormSection>

        <FormSection>
          <FormGroup>
            <Label>Q3: What is your application status (Mandatory)</Label>
            <Select 
              name="q3" 
              value={formData.q3} 
              onChange={handleChange}
              required
            >
              <option value="">-- Select status --</option>
              <option value="Maker in-progress filling in application details">Maker in-progress filling in application details</option>
              <option value="Pending EDD Concurrer">Pending EDD Concurrer</option>
              <option value="Pending EDD Approver">Pending EDD Approver</option>
              <option value="Pending/InProg Checker approval">Pending/InProg Checker approval</option>
            </Select>
          </FormGroup>

          {showQ3a && (
            <FormGroup>
              <Label>Q3.a: What is the NonIndividual CIF Status (Optional)</Label>
              <Select 
                name="q3a" 
                value={formData.q3a} 
                onChange={handleChange}
              >
                <option value="">-- Select status --</option>
                <option value="CIF created">CIF created</option>
                <option value="CIF has not created">CIF has not created</option>
              </Select>
            </FormGroup>
          )}

          {showQ3b && (
            <FormGroup>
              <Label>Q3.b: What is the NonIndividual Account Status (Optional)</Label>
              <Select 
                name="q3b" 
                value={formData.q3b} 
                onChange={handleChange}
              >
                <option value="">-- Select status --</option>
                <option value="Account created">Account created</option>
                <option value="Account has not created">Account has not created</option>
              </Select>
            </FormGroup>
          )}

          {showQ3c && (
            <FormGroup>
              <Label>Q3.c: What is the application BCA Status (Optional)</Label>
              <Select 
                name="q3c" 
                value={formData.q3c} 
                onChange={handleChange}
              >
                <option value="">-- Select status --</option>
                <option value="BCA Status: Pending">BCA Status: Pending</option>
                <option value="BCA Status: Terminated">BCA Status: Terminated</option>
                <option value="BCA Status: Rejected">BCA Status: Rejected</option>
                <option value="BCA Status: Success">BCA Status: Success</option>
                <option value="BCA Status: Pending (Error)/Rejected (Error) at AOS CIF creation">BCA Status: Pending (Error)/Rejected (Error) at AOS CIF creation</option>
                <option value="BCA Status: Pending (Error)/Rejected (Error) at Account Creation">BCA Status: Pending (Error)/Rejected (Error) at Account Creation</option>
                <option value="BCA Status: Pending (Error)/Rejected (Error) at Relationship Link Creation">BCA Status: Pending (Error)/Rejected (Error) at Relationship Link Creation</option>
                <option value="BCA Status: Pending (Error)/Rejected (Error) at SVS">BCA Status: Pending (Error)/Rejected (Error) at SVS</option>
              </Select>
            </FormGroup>
          )}

          {showQ3d && (
            <FormGroup>
              <Label>Q3.d: What is the application Bizsmart Status (Optional)</Label>
              <Select 
                name="q3d" 
                value={formData.q3d} 
                onChange={handleChange}
              >
                <option value="">-- Select status --</option>
                <option value="Bizsmart Status: NA">Bizsmart Status: NA</option>
                <option value="Bizsmart Status: Pending">Bizsmart Status: Pending</option>
                <option value="Bizsmart Status: Success">Bizsmart Status: Success</option>
                <option value="Bizsmart Status: Routed to Manual Processing">Bizsmart Status: Routed to Manual Processing</option>
                <option value="Bizsmart Status: Existing Bizsmart Customer">Bizsmart Status: Existing Bizsmart Customer</option>
              </Select>
            </FormGroup>
          )}
        </FormSection>

        <FormSection>
          <FormGroup>
            <Label>Q4: Please explain your error message/inquiry (Mandatory)</Label>
            <TextArea 
              name="q4" 
              value={formData.q4} 
              onChange={handleChange}
              placeholder="Please provide details about your issue or inquiry..."
              required
            />
          </FormGroup>
        </FormSection>

        <SubmitButton type="submit" disabled={!isFormValid}>
          Submit Incident Report
        </SubmitButton>
      </form>
    </FormContainer>
  );
};

export default IncidentForm;
