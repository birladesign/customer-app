import logoSrc from '../assets/logo.png';

// The Sleep Company's actual brand mark — imported (not a /public string
// path) so a production build can inline it as base64, same as every
// product image in data/orders.js.
export default function Logo({ className }) {
  return <img className={className} src={logoSrc} alt="The Sleep Company" />;
}
