import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  src: string;
  alt: string;
  placeholder: ReactNode;
  eager?: boolean;
  imageClassName?: string;
  placeholderClassName?: string;
};

export function ProgressiveImage({ src, alt, placeholder, eager = false, imageClassName = "", placeholderClassName = "" }: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    const image = imageRef.current;
    if (!image?.complete) return;
    if (image.naturalWidth > 0) setLoaded(true);
    else setFailed(true);
  }, [src]);

  return <>
    <span className={`progressive-image-placeholder ${placeholderClassName}`} aria-hidden="true">{placeholder}</span>
    {!failed ? <img
      ref={imageRef}
      className={`progressive-image${loaded ? " is-loaded" : ""}${imageClassName ? ` ${imageClassName}` : ""}`}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    /> : null}
  </>;
}
