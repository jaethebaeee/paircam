# Video Chat Frontend

Modern, clean, and beautiful frontend for the random video chat application.

## 🎨 Design Features

- ✨ **Modern UI**: Clean gradients, smooth animations, and glassmorphism effects
- 🎯 **Inter Font**: Professional, modern typography
- 🌈 **Beautiful Buttons**: Gradient buttons with hover effects and shadows
- 📱 **Responsive**: Works perfectly on mobile, tablet, and desktop
- 🎭 **Clean Navigation**: Minimal, modern navbar with backdrop blur
- 🦶 **Polished Footer**: Well-organized footer with links and info
- 🎬 **Smooth Animations**: Subtle transitions and hover effects
- 🌊 **Gradient Background**: Soft blue gradient background

## 🚀 Quick Start

```bash
# Install dependencies
cd packages/frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎨 UI Components

### Navbar
- Modern logo with gradient
- Clean navigation links
- Glassmorphism effect
- Sticky header

### Landing Page
- Hero section with gradient text
- Feature cards with hover effects
- Stats section
- Call-to-action buttons

### Video Chat
- Dual video layout
- Modern control buttons
- Chat panel with smooth animations
- Status indicators

### Footer
- Multi-column layout
- Links and information
- Social proof badges
- Clean typography

## 🎭 Button Styles

- **Primary**: Blue-to-indigo gradient with shadow
- **Secondary**: White with border
- **Danger**: Red-to-pink gradient
- **Success**: Emerald-to-teal gradient

All buttons have:
- Smooth hover effects
- Shadow animations
- Focus states
- Disabled states

## 🌈 Color Palette

- **Primary**: Blue (#0ea5e9) to Indigo (#6366f1)
- **Background**: Slate-50 to Blue-50 to Indigo-50 gradient
- **Text**: Slate-900 (primary), Slate-600 (secondary)
- **Accents**: Various gradients for visual interest

## 📦 Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Vite
- Heroicons
- Socket.io Client

## 🎯 Features

- Real-time video chat
- Text messaging
- Emoji reactions
- User controls (mute, camera, etc.)
- Report functionality
- Skip to next user

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Touch-friendly controls
- Optimized layouts for all screens

## 🔧 Configuration

### Tailwind Config
- Custom colors
- Custom fonts (Inter)
- Custom animations
- Form plugin

### Vite Config
- React plugin
- Port 5173
- Source maps enabled

## 🎨 Custom CSS Classes

```css
.btn - Base button
.btn-primary - Primary gradient button
.btn-secondary - Secondary outlined button
.btn-danger - Danger gradient button
.btn-success - Success gradient button
.card - Card with glassmorphism
.input - Modern input field
```

## 🚀 Development

```bash
# Run dev server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format

# Test
npm run test
```

## 📝 Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:3333
VITE_WS_URL=ws://localhost:3333
```

## 🎯 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

MIT
