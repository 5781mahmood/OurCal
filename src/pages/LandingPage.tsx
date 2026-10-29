import { Link } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'

export function LandingPage() {
  return (
    <div className="marketing">
      <SiteHeader />
      <main>
        <section className="hero-editorial">
          <p className="hero-kicker">Calorie diary for people who log every day</p>
          <h1>
            Track meals with clarity.
            <br />
            Stay accountable with friends.
          </h1>
          <p className="hero-body">
            OurCal combines a dense food catalog, a daily balance score, streak
            tracking, and private group chat. No photo guessing required.
          </p>
          <div className="hero-actions">
            <Link to="/app" className="btn-primary">
              Start in the app
            </Link>
            <a href="#product" className="btn-secondary">
              See how it works
            </a>
          </div>
        </section>

        <section id="product" className="editorial-section">
          <div className="editorial-copy">
            <h2>Built for daily decisions</h2>
            <p>
              Log breakfast through snacks in one scroll. Search hundreds of foods,
              add your own servings, and share custom items with the community when
              cloud sync is enabled.
            </p>
          </div>
          <figure className="editorial-figure">
            <div className="product-sheet" aria-hidden>
              <header>
                <span>Thursday</span>
                <strong>1,842 / 2,200</strong>
              </header>
              <ol className="sheet-streak">
                <li className="on">M</li>
                <li className="on">T</li>
                <li className="on">W</li>
                <li className="on">T</li>
                <li>F</li>
                <li>S</li>
                <li>S</li>
              </ol>
              <p className="sheet-score">Balance index 86</p>
              <ul>
                <li><span>Protein 128g</span><i className="macro-high" /></li>
                <li><span>Carbs 164g</span><i className="macro-mid" /></li>
                <li><span>Fat 48g</span><i className="macro-low" /></li>
              </ul>
            </div>
            <figcaption>Today view with macro traffic lights and streak week.</figcaption>
          </figure>
        </section>

        <section id="balance" className="editorial-section reverse">
          <div className="editorial-copy">
            <h2>Balance index</h2>
            <p>
              Cal AI focuses on photos. OurCal focuses on accountability math. Your
              balance index scores how close you are to calorie and macro targets in
              one number you can share with friends in chat.
            </p>
          </div>
          <figure className="editorial-figure">
            <div className="product-sheet" aria-hidden>
              <p className="sheet-score">86</p>
              <p>Calories within 8% of goal. Protein above target. Fat still low.</p>
              <ul>
                <li>Share this score in a private thread.</li>
                <li>Badges unlock at 3, 7, 14, and 30 days.</li>
              </ul>
            </div>
            <figcaption>One score from calories plus protein, carbs, and fat.</figcaption>
          </figure>
        </section>

        <section className="editorial-section">
          <div className="editorial-copy">
            <h2>Friends, QR invites, group chat</h2>
            <p>
              Add people by global username or QR code. Message one friend or spin up
              a small group thread for meal check-ins. Badges and streaks show on your
              profile when you hit milestones.
            </p>
          </div>
          <figure className="editorial-figure">
            <div className="product-sheet" aria-hidden>
              <header>
                <span>@alex</span>
                <strong>Thread</strong>
              </header>
              <ul>
                <li>Logged lunch. Balance index 86.</li>
                <li>On a 4-day streak.</li>
                <li>Invite with QR or @username.</li>
              </ul>
            </div>
            <figcaption>Private threads instead of public group feeds.</figcaption>
          </figure>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
