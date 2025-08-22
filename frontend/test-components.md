# Frontend Component Testing

## Manual Testing Checklist

### Landing Page (http://localhost:3001)
- [ ] Page loads without errors
- [ ] Hero section displays correctly
- [ ] Feature cards are responsive
- [ ] CTA buttons work (redirect to /setup)
- [ ] Mobile view looks good

### Setup Wizard (http://localhost:3001/setup)
- [ ] Progress bar shows correctly
- [ ] Step 1: Telegram Bot Setup
  - [ ] Instructions are clear
  - [ ] Token input validation works
  - [ ] Error messages display properly
  - [ ] Success state shows bot info
- [ ] Step 2: Gemini API Setup  
  - [ ] API key input with show/hide toggle
  - [ ] Validation works with real key
  - [ ] Error handling for invalid keys
- [ ] Step 3: Google Sheets
  - [ ] OAuth flow instructions
  - [ ] Connect button works
  - [ ] Success state shows sheet info

### Component Responsiveness
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024) 
- [ ] Mobile (375x667)
- [ ] Mobile (320x568)

### Browser Compatibility
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Quick Component Test

You can test individual components by creating test pages:

```tsx
// frontend/app/test/page.tsx
import TelegramBotStep from '@/components/setup/telegram-bot-step'

export default function TestPage() {
  return (
    <div className="container mx-auto py-8">
      <TelegramBotStep 
        onNext={() => console.log('Next clicked')}
        onBack={() => console.log('Back clicked')}
      />
    </div>
  )
}
```

Then visit http://localhost:3001/test