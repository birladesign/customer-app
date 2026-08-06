import './PhoneFrame.css';

// The shared 430px mobile viewport every screen lives inside. Owns the frame
// bounds and clips horizontal overflow so screen-to-screen slide transitions
// don't leak past the edges.
export default function PhoneFrame({ children }) {
  return <div className="phone-frame">{children}</div>;
}
