export function useSmoothScroll() {
  const scrollToSection = (elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  return {
    scrollToSection
  }
}
