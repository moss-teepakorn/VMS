import { useEffect } from 'react'
import TomSelect from 'tom-select'

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
          const instance = new TomSelect(select, {
            create: false,
            maxOptions: 1000,
            hideSelected: false,
            allowEmptyOption: true,
            closeAfterSelect: true,
            searchField: ['text'],
            sortField: [{ field: '$order' }],
            placeholder: select.getAttribute('placeholder') || 'ค้นหา',
            render: {
              no_results(data, escape) {
                return `<div class="no-results">ไม่พบข้อมูล: ${escape(data.input)}</div>`
              },
              no_more_results() {
                return '<div class="no-more-results"></div>'
              },
            },
          })
          instances.set(select, instance)
          continue
        }

        existing.sync()
        const targetValue = String(select.value ?? '')
        const currentValue = String(existing.getValue() ?? '')
        if (targetValue !== currentValue) {
          existing.setValue(targetValue, true)
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
