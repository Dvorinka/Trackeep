import type { JSX } from 'solid-js'
import { Portal } from 'solid-js/web'

interface ModalPortalProps {
  children: JSX.Element
}

export const ModalPortal = (props: ModalPortalProps) => {
  return <Portal mount={document.body}>{props.children}</Portal>
}
