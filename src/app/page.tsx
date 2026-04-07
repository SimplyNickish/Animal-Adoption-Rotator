import { redirect } from 'next/navigation';

export default function Home() {
  // Completely eradicating the Vercel Landing Page.
  // Anyone who attempts to go to the Vercel URL natively will be forcibly redirected back to the user's main website to login.
  redirect('https://nickish.fourthwall.com'); 
}
