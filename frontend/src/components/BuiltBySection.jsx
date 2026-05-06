export default function BuiltBySection() {
  return (
    <section className="builtby">
      <header className="builtby__header">
        <h2 className="builtby__name">{/* TODO: name */}Your Name</h2>
        <p className="builtby__role">{/* TODO: role */}Role · Location</p>
      </header>

      <div className="builtby__bio">
        {/* TODO: bio — replace with one or two short paragraphs about you, your work, what you care about. */}
        <p>
          Short bio paragraph placeholder. Replace with a sentence or two about who you are,
          what you build, and what drew you to this project.
        </p>
        <p>
          Optional second paragraph with more on your interests or background.
        </p>
      </div>

      <ul className="builtby__links">
        {/* TODO: links — replace href values, keep or remove rows as needed. */}
        <li><a className="builtby__link" href="#" target="_blank" rel="noreferrer">GitHub</a></li>
        <li><a className="builtby__link" href="#" target="_blank" rel="noreferrer">LinkedIn</a></li>
        <li><a className="builtby__link" href="mailto:you@example.com">Email</a></li>
      </ul>
    </section>
  )
}
