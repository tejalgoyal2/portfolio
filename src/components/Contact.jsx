import SectionHeader from './SectionHeader';
import { useScrollReveal } from '../hooks/useScrollReveal';

export default function Contact() {
  const ref = useScrollReveal();
  return (
    <section id="s-contact" className="pt-20 pb-16">
      <SectionHeader id="contact-h" title="Contact" />
      <div ref={ref} className="reveal panel p-5">
        <pre className="text-text text-xs font-mono leading-[2.2] m-0 whitespace-pre-wrap">
{`$ cat contact.txt

  GitHub    : `}
          <a href="https://github.com/tejalgoyal2" target="_blank" rel="noopener noreferrer"
            className="text-green no-underline hover:underline">github.com/tejalgoyal2</a>
{`
  LinkedIn  : `}
          <a href="https://www.linkedin.com/in/tejalgoyal" target="_blank" rel="noopener noreferrer"
            className="text-cyan no-underline hover:underline">linkedin.com/in/tejalgoyal</a>
{`
  Email     : `}
          <a href="mailto:tejalgoyal@uvic.ca"
            className="text-amber no-underline hover:underline">tejalgoyal@uvic.ca</a>
{`

$ echo $OPEN_TO
`}
          <span className="text-green">cybersecurity roles, research collaborations, and interesting problems worth solving</span>
        </pre>
      </div>
    </section>
  );
}
