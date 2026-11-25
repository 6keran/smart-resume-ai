'use client';

import { useState, type ReactNode } from 'react';
import { AlertTriangle, Check, Menu, X } from 'lucide-react';
import { NimbusMascot, type NimbusState } from '@/components/assistant/NimbusMascot';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input, SearchInput } from '@/components/ui/Input';
import {
  AnimatedCard,
  AnimatedCounter,
  AnimatedDrawer,
  AnimatedProgressBar,
  AnimatedTabPanel,
  ModalOverlay,
  PageTransition,
  ScrollReveal,
  StaggerChild,
  StaggerGroup,
  TextReveal,
} from '@/components/ui/MotionPrimitives';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Skeleton, SkeletonBoard, SkeletonCard } from '@/components/ui/Skeleton';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { YouTubeIcon } from '@/components/ui/YouTubeIcon';

const colorTokens = [
  { name: 'Background', token: '--color-bg', className: 'bg-bg' },
  { name: 'Subtle background', token: '--color-bg-subtle', className: 'bg-bg-subtle' },
  { name: 'Hover background', token: '--color-bg-subtle-2', className: 'bg-bg-subtle-2' },
  { name: 'Primary text', token: '--color-text', className: 'bg-text' },
  { name: 'Secondary text', token: '--color-text-secondary', className: 'bg-text-secondary' },
  { name: 'Tertiary text', token: '--color-text-tertiary', className: 'bg-text-tertiary' },
  { name: 'Hairline border', token: '--color-border-hairline', className: 'bg-border-hairline' },
  { name: 'Strong border', token: '--color-border', className: 'bg-border' },
  { name: 'Input border', token: '--color-border-input', className: 'bg-border-input' },
  { name: 'Accent', token: '--color-accent', className: 'bg-accent' },
  { name: 'Accent hover', token: '--color-accent-hover', className: 'bg-accent-hover' },
  { name: 'Success', token: '--color-success', className: 'bg-success' },
  { name: 'Warning', token: '--color-warning', className: 'bg-warning' },
  { name: 'Danger', token: '--color-danger', className: 'bg-danger' },
] as const;

const typeTokens = [
  { name: 'Display', className: 'text-display font-semibold tracking-display', sample: 'Career clarity, without the noise.' },
  { name: 'Heading 1', className: 'text-h1 font-semibold tracking-heading', sample: 'Build a stronger resume' },
  { name: 'Heading 2', className: 'text-h2 font-semibold tracking-heading', sample: 'Resume analysis' },
  { name: 'Heading 3', className: 'text-h3 font-semibold tracking-heading', sample: 'Actionable feedback' },
  { name: 'Body large', className: 'text-body-lg', sample: 'Long-form guidance uses a comfortable reading rhythm.' },
  { name: 'Body', className: 'text-body', sample: 'Default application copy is concise and readable.' },
  { name: 'Small', className: 'text-small', sample: 'Supporting information and table details.' },
  { name: 'Caption', className: 'text-caption', sample: 'CAPTION AND BADGE TEXT' },
] as const;

const mascotStates: NimbusState[] = ['idle', 'greeting', 'listening', 'thinking', 'answering', 'success', 'limited', 'error'];
const mascotSizes = [24, 32, 56, 64, 96];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="border-b border-border-hairline pb-3">
        <h2 className="text-h2 font-semibold tracking-heading text-text">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function StyleGuideClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mascotState, setMascotState] = useState<NimbusState>('idle');
  const [mascotSize, setMascotSize] = useState(96);
  const [mascotPaused, setMascotPaused] = useState(false);
  const [mascotReplay, setMascotReplay] = useState(0);

  return (
    <PageTransition className="min-h-screen bg-bg-subtle text-text">
      <main className="mx-auto max-w-app space-y-12 px-4 py-10 sm:px-6 sm:py-12">
        <header className="rounded-panel bg-bg p-6 shadow-card sm:p-8">
          <span className="inline-flex rounded-full bg-accent-tint px-3 py-1 text-caption font-medium text-accent">
            Development only
          </span>
          <h1 className="mt-4 text-h1 font-semibold tracking-heading">Design system style guide</h1>
          <p className="mt-2 max-w-3xl text-body-lg text-text-secondary">
            Antideploy-inspired token reference: warm paper, near-black ink, electric blue, generous radius, and restrained motion.
          </p>
        </header>

        <Section title="Nimbus · AI Assistant avatar">
          <div id="nimbus-preview" className="space-y-5 rounded-card bg-bg p-4 shadow-card sm:p-6">
            <p className="text-body text-text-secondary">Original cloud robot artwork. Nimbus is a visual avatar; the assistant identity stays AI Assistant.</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Mascot state">
              {mascotStates.map((state) => (
                <button key={state} type="button" aria-pressed={mascotState === state} onClick={() => { setMascotState(state); setMascotReplay((value) => value + 1); }} className="min-h-11 rounded-control border border-border px-3 text-body capitalize aria-pressed:border-accent aria-pressed:bg-accent-tint aria-pressed:text-accent">
                  {state}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-body">Preview size
                <select aria-label="Mascot preview size" value={mascotSize} onChange={(event) => setMascotSize(Number(event.target.value))} className="min-h-11 rounded-control border border-border bg-bg px-3">
                  {mascotSizes.map((size) => <option key={size} value={size}>{size}px</option>)}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-2 text-body"><input type="checkbox" checked={mascotPaused} onChange={(event) => setMascotPaused(event.target.checked)} />Pause mascot motion</label>
              <button type="button" onClick={() => setMascotReplay((value) => value + 1)} className="min-h-11 rounded-control border border-border px-3 text-body">Replay motion</button>
            </div>
            <div data-testid="nimbus-active-preview" data-state={mascotState} className="flex min-h-32 items-center justify-center rounded-control bg-bg-subtle-2">
              <NimbusMascot key={`${mascotState}-${mascotReplay}-${mascotPaused}`} state={mascotState} size={mascotSize} className={mascotPaused || modalOpen || drawerOpen ? 'nimbus-static' : ''} />
            </div>
            <p className="text-small text-text-secondary">One animated preview. Reduced motion shows static poses; static samples below never loop.</p>
          </div>
          <div data-testid="nimbus-state-gallery" className="grid gap-4 lg:grid-cols-2">
            {mascotStates.map((state) => (
              <div key={state} data-mascot-sample={state} className="rounded-card bg-bg p-4 shadow-card sm:p-6">
                <h3 className="text-h3 capitalize">{state}</h3>
                <div className="mt-4 flex flex-wrap items-end gap-4">
                  {mascotSizes.map((size) => (
                    <figure key={size} data-mascot-size={size} className="grid min-w-8 justify-items-center gap-2">
                      <NimbusMascot state={state} size={size} className="nimbus-static" />
                      <figcaption className="text-caption text-text-secondary">{size}px</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Color tokens">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {colorTokens.map((color) => (
              <div key={color.token} className="rounded-card bg-bg p-4 shadow-card">
                <div className={`h-16 rounded-control border border-border-hairline ${color.className}`} />
                <p className="mt-3 text-body font-medium text-text">{color.name}</p>
                <code className="text-caption text-text-secondary">{color.token}</code>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-control border border-accent bg-accent-tint p-3 text-small text-accent">Accent tint</div>
            <div className="rounded-control border border-success bg-success-tint p-3 text-small text-success">Success tint</div>
            <div className="rounded-control border border-warning bg-warning-tint p-3 text-small text-warning">Warning tint</div>
            <div className="rounded-control border border-danger bg-danger-tint p-3 text-small text-danger">Danger tint</div>
          </div>
        </Section>

        <Section title="Typography">
          <div className="space-y-4 rounded-card bg-bg p-6 shadow-card">
            {typeTokens.map((type) => (
              <div key={type.name} className="grid gap-2 border-b border-border-hairline pb-4 last:border-0 last:pb-0 md:grid-cols-[9rem_1fr]">
                <span className="text-caption font-medium text-text-secondary">{type.name}</span>
                <p className={type.className}>{type.sample}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Radius, elevation and progress">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-control bg-bg-subtle-2 p-5 shadow-card">12px control radius</div>
            <div className="rounded-card bg-bg-subtle-2 p-5 shadow-card">22px card radius</div>
            <div className="rounded-panel bg-bg-subtle-2 p-5 shadow-popover">32px panel radius</div>
          </div>
          <div className="rounded-card bg-bg p-6 shadow-card">
            <div className="mb-2 flex items-center justify-between text-small text-text-secondary">
              <span>Progress</span>
              <span>72%</span>
            </div>
            <AnimatedProgressBar value={72} className="h-1.5 bg-border-hairline" />
          </div>
        </Section>

        <Section title="Buttons and inputs">
          <div className="space-y-6 rounded-card bg-bg p-6 shadow-card">
            <div className="flex flex-wrap gap-3">
              <Button rounded="xl">Primary</Button>
              <Button variant="secondary" rounded="xl">Secondary</Button>
              <Button variant="outline" rounded="xl">Outline</Button>
              <Button variant="ghost" rounded="xl">Ghost</Button>
              <Button variant="destructive" rounded="xl">Destructive</Button>
              <Button rounded="xl" isLoading>Loading</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input aria-label="Example input" placeholder="Example input" />
              <SearchInput aria-label="Example search" placeholder="Search the style guide" />
              <Input aria-label="Example error input" placeholder="Error example" error="Explain the problem in text." />
              <Input aria-label="Disabled input" placeholder="Disabled" disabled />
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="h-10 rounded-control bg-accent px-4 text-body font-medium text-on-accent hover:bg-accent-hover">Token primary</button>
              <button className="h-10 rounded-control border border-border bg-bg px-4 text-body font-medium text-text hover:bg-bg-subtle">Token outline</button>
            </div>
          </div>
        </Section>

        <Section title="Cards, badges and scores">
          <div className="grid gap-4 lg:grid-cols-3">
            <GlassCard>
              <h3 className="text-h3 font-semibold">Default shared card</h3>
              <p className="mt-2 text-body text-text-secondary">Existing GlassCard rendered against the new compatibility tokens.</p>
            </GlassCard>
            <AnimatedCard className="rounded-card bg-bg p-6 shadow-card">
              <h3 className="text-h3 font-semibold">Animated card</h3>
              <p className="mt-2 text-body text-text-secondary">Motion respects reduced-motion preferences.</p>
            </AnimatedCard>
            <div className="flex items-center justify-center rounded-card bg-bg p-6 shadow-card">
              <ScoreRing score={72} label="Demo score" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 rounded-card bg-bg p-6 shadow-card">
            <SkillBadge skill="Example skill" status="verified" score={8} />
            <SkillBadge skill="Example skill" status="claimed" />
            <SkillBadge skill="Example skill" status="not-verified" />
            <span className="inline-flex items-center gap-2 rounded-full bg-danger-tint px-3 py-1 text-caption font-medium text-danger">
              <AlertTriangle className="h-4 w-4" /> Alert badge
            </span>
          </div>
        </Section>

        <Section title="Loading and state views">
          <div className="grid gap-4 lg:grid-cols-3">
            <SkeletonCard />
            <EmptyState title="Nothing here yet" description="A real empty state explains what the user can do next." />
            <ErrorState title="Example error" message="Errors pair a clear explanation with an optional recovery action." onRetry={() => undefined} />
          </div>
          <LoadingState title="Loading example" message="The current shared loading state is shown for Phase 2 review." />
          <div className="rounded-card bg-bg p-5 shadow-card">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </div>
          <SkeletonBoard columns={2} />
        </Section>

        <Section title="Motion and utility primitives">
          <div className="grid gap-4 md:grid-cols-2">
            <ScrollReveal className="rounded-card bg-bg p-5 shadow-card">Scroll reveal primitive</ScrollReveal>
            <AnimatedTabPanel tabKey="style-guide" className="rounded-card bg-bg p-5 shadow-card">Animated tab panel</AnimatedTabPanel>
            <StaggerGroup className="grid gap-3 rounded-card bg-bg p-5 shadow-card">
              <StaggerChild>Stagger child one</StaggerChild>
              <StaggerChild>Stagger child two</StaggerChild>
            </StaggerGroup>
            <div className="rounded-card bg-bg p-5 shadow-card">
              <TextReveal text="Text reveal primitive" />
              <p className="mt-3 text-body text-text-secondary">
                Animated values: <AnimatedNumber value={42} suffix="%" /> / <AnimatedCounter value={72} suffix="%" />
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-card bg-bg p-6 shadow-card">
            <button onClick={() => setModalOpen(true)} className="h-10 rounded-control bg-accent px-4 text-body font-medium text-on-accent hover:bg-accent-hover">Open modal</button>
            <button onClick={() => setDrawerOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-bg px-4 text-body font-medium text-text hover:bg-bg-subtle">
              <Menu className="h-4 w-4" /> Open drawer
            </button>
            <span className="inline-flex items-center gap-2 text-small text-text-secondary">
              <YouTubeIcon className="h-5 w-5 text-danger" /> Shared icon component
            </span>
          </div>
        </Section>
      </main>

      <ModalOverlay isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div role="dialog" aria-modal="true" aria-labelledby="style-guide-modal-title" className="w-[min(28rem,calc(100vw-2rem))] rounded-panel bg-bg p-6 shadow-popover">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="style-guide-modal-title" className="text-h2 font-semibold">Modal primitive</h2>
              <p className="mt-2 text-body text-text-secondary">Escape and overlay click close this existing motion primitive.</p>
            </div>
            <button onClick={() => setModalOpen(false)} aria-label="Close modal" className="rounded-control p-2 text-text-secondary hover:bg-bg-subtle hover:text-text"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-5 flex justify-end">
            <button onClick={() => setModalOpen(false)} className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-body font-medium text-on-accent hover:bg-accent-hover"><Check className="h-4 w-4" /> Done</button>
          </div>
        </div>
      </ModalOverlay>

      <AnimatedDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} className="w-72 bg-bg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-h2 font-semibold">Drawer primitive</h2>
            <p className="mt-2 text-body text-text-secondary">Existing animated drawer review.</p>
          </div>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close drawer" className="rounded-control p-2 text-text-secondary hover:bg-bg-subtle hover:text-text"><X className="h-5 w-5" /></button>
        </div>
      </AnimatedDrawer>
    </PageTransition>
  );
}
