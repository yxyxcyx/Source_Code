// src/components/Chat/ChatInput.tsx
import React, { useState } from 'react';
import styled from 'styled-components';

interface ChatInputProps {
  onSendMessage: (message: string, imageUrl?: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Look for image items in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Check if the item is an image
      if (item.type.startsWith('image/')) {
        e.preventDefault(); // Prevent default paste behavior for images
        
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setSelectedImage(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
        break; // Only handle the first image
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || selectedImage) {
      onSendMessage(message, selectedImage || undefined);
      setMessage('');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <InputContainer>
      {selectedImage && (
        <ImagePreviewContainer>
          <ImagePreview src={selectedImage} alt="Selected" />
          <RemoveImageButton onClick={handleRemoveImage}>
            ✕
          </RemoveImageButton>
        </ImagePreviewContainer>
      )}
      <InputForm onSubmit={handleSubmit}>
        <HiddenFileInput
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
        />
        <ImageUploadButton
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload image"
        >
          📎
        </ImageUploadButton>
        <StyledInput
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onPaste={handlePaste}
          placeholder="Type a message or paste an image..."
        />
        <SendButton type="submit" disabled={!message.trim() && !selectedImage}>
          ➤
        </SendButton>
      </InputForm>
      <Disclaimer>
        This knowledge assistant is intended as a reference tool built on regulatory frameworks. Interpretations remain subject to Group Risk & Compliance review.
      </Disclaimer>
    </InputContainer>
  );
};

const InputContainer = styled.div`
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background-color: #ffffff;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

const InputForm = styled.form`
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:focus-within {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const StyledInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  color: #374151;
  font-size: 16px;
  outline: none;
  resize: none;

  &::placeholder {
    color: #9ca3af;
  }
`;

const SendButton = styled.button`
  background-color: #2563eb;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 32px;

  &:disabled {
    background-color: #d1d5db;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    background-color: #1d4ed8;
  }
`;

const Disclaimer = styled.div`
  text-align: center;
  margin-top: 12px;
  font-size: 12px;
  color: #6b7280;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ImageUploadButton = styled.button`
  background-color: transparent;
  border: none;
  color: #6b7280;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: #2563eb;
  }
`;

const ImagePreviewContainer = styled.div`
  position: relative;
  margin-bottom: 12px;
  display: inline-block;
`;

const ImagePreview = styled.img`
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;

  &:hover {
    background-color: #dc2626;
  }
`;

export default ChatInput;