import { useEffect } from 'react'
import Choices from 'choices.js'

const SELECTOR = 'select[data-search-filter="true"]'

export default function GlobalSearchableDropdowns() {
  useEffect(() => {
    const instances = new Map()

    const enhanceSelects = () => {
      const selects = Array.from(document.querySelectorAll(SELECTOR))

      for (const select of selects) {
        if (!(select instanceof HTMLSelectElement)) continue
        if (select.multiple) continue

        const existing = instances.get(select)
        if (!existing) {
          const instance = new Choices(select, {
            searchEnabled: true,
            searchFloor: 0,
            shouldSort: false,
            itemSelectText: '',
            searchResultLimit: 100,
            renderChoiceLimit: -1,
            allowHTML: false,
            searchPlaceholderValue: 'ค้นหา',
            noResultsText: 'ไม่พบข้อมูล',
            noChoicesText: 'ไม่มีตัวเลือก',
          })
          instances.set(select, instance)
          continue
        }

        const targetValue = String(select.value ?? '')
        const currentValue = String(existing.getValue(true) ?? '')
        if (targetValue !== currentValue) {
          existing.setChoiceByValue(targetValue)
        }
      }

      for (const [select, instance] of Array.from(instances.entries())) {
        if (!document.contains(select)) {
          instance.destroy()
          instances.delete(select)
        }
      }
    }

    const observer = new MutationObserver(() => {
      queueMicrotask(enhanceSelects)
    })

    enhanceSelects()
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'disabled'],
    })

    return () => {
      observer.disconnect()
      for (const [, instance] of instances) {
        instance.destroy()
      }
      instances.clear()
    }
  }, [])

  return null
}
