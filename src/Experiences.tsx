import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export function Lucide({ name, className = '' }: { name: string; className?: string }) {
  return <img src={`/assets/lucide/${name}.svg`} alt="" draggable={false} className={className}/>;
}

const banners = [
  { category: 'Multi-currency', title: 'More currencies, more possibilities.', description: 'Manage your money across borders.', art: 'original' },
  { category: 'Virtual cards', title: 'Spend globally, effortlessly.', description: 'Create a virtual card for your everyday payments.', art: 'card' },
  { category: 'Savings', title: 'Save towards what matters.', description: 'Set savings goals and track your progress.', art: 'savings' },
  { category: 'Global payments', title: 'Payments without borders.', description: 'Send and receive money around the world.', art: 'global' },
];

export function PromoCarousel({ index, onChange }: { index: number; onChange: (index: number) => void }) {
  const reduced = useReducedMotion();
  const change = (next: number) => onChange(Math.max(0, Math.min(banners.length - 1, next)));
  return <section className="promo-section" aria-label="Explore RavenPay" aria-roledescription="carousel">
    <div className="carousel-window" tabIndex={0} aria-label="Promotional banners. Use left and right arrow keys to browse." onKeyDown={event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); change(index + (event.key === 'ArrowRight' ? 1 : -1)); }
    }}>
      <motion.div className="carousel-track" animate={{ x: `${-index * 100}%` }} initial={false} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 32 }}>
        {banners.map((banner, slide) => <div key={banner.art} className="carousel-slide" aria-hidden={slide !== index} role="group" aria-roledescription="slide" aria-label={`${slide + 1} of 4`}>
          <motion.div className={`promo promo-${banner.art}`} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} dragSnapToOrigin dragMomentum={false}
            onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 35 || (Math.abs(info.offset.x) > 8 && Math.abs(info.velocity.x) > 350)) change(index + (info.offset.x < 0 ? 1 : -1)); }}>
            <div className="promo-copy"><p>{banner.category}</p><h1>{banner.title}</h1><p>{banner.description}</p></div>
            {slide === 0 ? <div className="promo-art"><img draggable={false} src="/assets/banner.png" alt="Pink multi-currency wallet illustration"/></div> : <div className={`banner-graphic graphic-${banner.art}`} aria-hidden="true">
              {slide === 1 ? <><div className="mini-card back-card"/><div className="mini-card front-card"><Lucide name="credit-card"/><span>••••  2048</span><b>RavenPay</b></div></> : slide === 2 ? <><div className="goal-orbit"/><div className="graphic-tile"><Lucide name="piggy-bank"/></div><div className="tiny-spark"><Lucide name="sparkles"/></div></> : <><div className="graphic-tile globe-tile"><Lucide name="globe"/></div><span className="transfer-arrow"><Lucide name="arrow-up-right"/></span></>}
            </div>}
          </motion.div>
        </div>)}
      </motion.div>
    </div>
    <div className="pagination carousel-pagination">{banners.map((banner, dot) => <button key={banner.art} aria-label={`Show banner ${dot + 1}: ${banner.category}`} aria-current={dot === index ? 'true' : undefined} onClick={() => change(dot)}><motion.span initial={false} animate={{ width: dot === index ? 14 : 8, backgroundColor: dot === index ? '#fb72fe' : '#d9d9d9' }} transition={{ duration: reduced ? 0 : 0.2 }}/></button>)}</div>
    <span className="sr-only" aria-live="polite">Banner {index + 1} of 4: {banners[index].title}</span>
  </section>;
}

type MenuItem = { icon: string; label: string; detail: string };
const moneyOptions: MenuItem[] = [
  { icon: 'wallet', label: 'Accounts', detail: 'Your money, across currencies' },
  { icon: 'piggy-bank', label: 'Savings', detail: 'Make room for your next goal' },
];
const supportOptions: MenuItem[] = [
  { icon: 'settings', label: 'Settings', detail: 'Make RavenPay feel like you' },
  { icon: 'circle-help', label: 'Help & Support', detail: 'A little help, whenever you need it' },
];
const profileOptions: MenuItem[] = [
  { icon: 'user-round', label: 'Personal information', detail: 'Your details, all in one place' },
  { icon: 'sliders-horizontal', label: 'Account preferences', detail: 'Currency, language and more' },
  { icon: 'shield-check', label: 'Security & privacy', detail: 'Stay in control of your account' },
  { icon: 'bell', label: 'Notifications', detail: 'Choose what you hear from us' },
];

function MenuSection({ title, items, delay = 0 }: { title: string; items: MenuItem[]; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.section className="menu-section" initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : delay, duration: reduced ? 0 : .25 }}>
    <h2>{title}</h2><div className="menu-card">{items.map(item => <div className="menu-row" key={item.label}>
      <span className="menu-icon"><Lucide name={item.icon}/></span><div className="menu-copy"><h3>{item.label}</h3><p>{item.detail}</p></div><Lucide name="chevron-right" className="menu-chevron"/>
    </div>)}</div>
  </motion.section>;
}

export function DetailScreen({ page, onBack }: { page: 'more' | 'profile'; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <>
    <header className="detail-header"><button className="back-button" onClick={onBack} aria-label="Back to Home"><Lucide name="arrow-left"/></button><h1 ref={heading} tabIndex={-1}>{page === 'more' ? 'More' : 'Profile'}</h1><span className="header-spacer"/></header>
    <main className="detail-main">
      {page === 'more' ? <><div className="page-intro"><p>Make more of your money.</p><span>Everything you need, in one place.</span></div><MenuSection title="Your money" items={moneyOptions}/><MenuSection title="Here for you" items={supportOptions} delay={.06}/></> : <>
        <div className="profile-card"><div className="profile-avatar-ring"><img src="/assets/avatar.png" alt="Raven"/></div><h2>Raven</h2><p>raven@example.com</p><span className="profile-tag">Your RavenPay account</span></div>
        <MenuSection title="Your account" items={profileOptions}/><MenuSection title="Need a hand?" items={[supportOptions[1]]} delay={.06}/>
      </>}
      <p className="detail-footer">A little more freedom. RavenPay.</p>
    </main>
  </>;
}
