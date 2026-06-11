export default function BuiltBySection() {
  return (
    <section className="builtby">
      <header className="builtby__header">
        <h2 className="builtby__name">{/* TODO: name */}Mustafa Anas</h2>
        <p className="builtby__role">{/* TODO: role */}Syria · Canada</p>
      </header>

      <div className="builtby__bio">
        {/* TODO: bio — replace with one or two short paragraphs about you, your work, what you care about. */}
        <p>I am a Full Stack Developer passionate about building technology that creates meaningful impact in governance, security, and language. My expertise lies in designing and developing scalable web applications, while continuously exploring the transformative potential of artificial intelligence to enhance productivity, streamline development and communication workflows, and unlock insights from human language and data.
        </p>
        <p>
          My professional experience sits at the intersection of technology and civil society. I have collaborated with NGOs and civil society organizations across Syria and Europe on initiatives spanning education, governance, human rights, and cybersecurity. In addition to my technical background, I bring experience in project management and media operations, allowing me to bridge strategic objectives with effective execution and storytelling.
        </p>
      </div>

      <ul className="builtby__links">
        {/* TODO: links — replace href values, keep or remove rows as needed. */}
        <li><a className="builtby__link" href="https://github.com/MustafaAnasKH99/" target="_blank" rel="noreferrer">GitHub</a></li>
        <li><a className="builtby__link" href="https://www.linkedin.com/in/mustafa-kharnoub/" target="_blank" rel="noreferrer">LinkedIn</a></li>
        <li><a className="builtby__link" href="mailto:khmostafa4@gmail.com">Email</a></li>
      </ul>
    </section>
  )
}
