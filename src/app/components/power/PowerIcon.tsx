import { isJumboEmojiText } from '$utils/emojiDetection';
import { useRenderableMediaUrl } from '$hooks/useRenderableMediaUrl';
import * as css from './style.css';

type PowerIconProps = css.PowerIconVariants & {
  iconSrc: string;
  name?: string;
};

export function PowerIcon({ size, iconSrc, name }: PowerIconProps) {
  const resolvedSrc = useRenderableMediaUrl(iconSrc);

  if (isJumboEmojiText(iconSrc, 1)) {
    return <span className={css.PowerIcon({ size })}>{iconSrc}</span>;
  }

  if (!resolvedSrc) return null;

  return <img className={css.PowerIcon({ size })} src={resolvedSrc} alt={name} />;
}
