import { createContext, useContext, useEffect, useState, type ReactNode, type MouseEvent } from 'react';

type RouterCtx = { path: string; navigate: (to: string, opts?: { replace?: boolean }) => void };
const Ctx = createContext<RouterCtx>({ path: '/', navigate: () => {} });

const clean = (hash: string) => {
  const raw = hash.replace(/^#/, '');
  return raw.startsWith('/') ? raw : '/' + raw;
};

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => clean(location.hash || '/'));

  useEffect(() => {
    const onChange = () => setPath(clean(location.hash || '/'));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [path]);

  const navigate = (to: string, opts?: { replace?: boolean }) => {
    const target = '#' + (to.startsWith('/') ? to : '/' + to);
    if (opts?.replace) history.replaceState(null, '', target);
    else location.hash = target;
    setPath(clean(target));
  };

  return <Ctx.Provider value={{ path, navigate }}>{children}</Ctx.Provider>;
}

export const useRouter = () => useContext(Ctx);

export function useQuery() {
  const { path } = useRouter();
  const [, qs] = path.split('?');
  return new URLSearchParams(qs || '');
}

export function Link({ to, children, className, onClick, ...rest }: { to: string; children: ReactNode; className?: string; onClick?: () => void } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>) {
  const { navigate } = useRouter();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClick?.();
    navigate(to);
  };
  return (
    <a href={`#${to}`} className={className} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
