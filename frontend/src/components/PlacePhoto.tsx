import { useState } from "react";

/**
 * A reviewed place's photograph, over whatever coloured panel it sits on.
 *
 * Its own component for the one piece of state it needs. An `onError` that
 * removed the `<img>` from the DOM directly would take it out behind
 * React's back, which crashes the reconciler the next time it touches that
 * element — so a failure is state, and the panel underneath is what shows.
 *
 * Decorative on purpose: every caller puts the place's name beside it, and
 * repeating that name in `alt` only makes a screen reader say it twice.
 *
 * A photograph is never substituted. A place without one keeps the plain
 * panel rather than borrowing a generic library or park scene, which would
 * be showing somebody a picture of a building they are not being sent to.
 */
export function PlacePhoto({
  src,
  className = "place-result-photo"
}: {
  src: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <img className={className} src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
  );
}
