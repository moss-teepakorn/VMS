import { useEffect } from 'react'
import TomSelect from 'tom-select'

const SELECTOR = 'select[data-search-filter="true"]'

export default function GlobalSearchableDropdowns() {
  useEffect(() => {
    const instances = new Map()
    const markFailed = (select) => {
      try {
        select.setAttribute('data-search-filter-failed', 'true')
      } catch {
        // no-op
      }
    }

    const enhanceSelects = () => {
      const selects = Array.from(document.querySelectorAll(SELECTOR))

      for (const select of selects) {
        if (!(select instanceof HTMLSelectElement)) continue
        if (select.multiple) continue
        if (select.getAttribute('data-search-filter-failed') === 'true') continue

        const existing = instances.get(select)
        if (!existing) {
          try {
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
          } catch (error) {
            console.warn('Searchable dropdown init failed:', error)
            markFailed(select)
          }
          continue
        }

        try {
          existing.sync()
          const targetValue = String(select.value ?? '')
          const currentValue = String(existing.getValue() ?? '')
          if (targetValue !== currentValue) {
            existing.setValue(targetValue, true)
          }
        } catch (error) {
          console.warn('Searchable dropdown sync failed:', error)
          try {
            existing.destroy()
          } catch {
            // no-op
          }
          instances.delete(select)
          markFailed(select)
        }
      }

      for (const [select, instance] of Array.from(instances.entries())) {
        if (!document.contains(select)) {
          try {
            instance.destroy()
          } catch {
            // no-op
          }
          instances.delete(select)
        }
      }
    }

    const observer = new MutationObserver(() => {
      try {
        queueMicrotask(enhanceSelects)
      } catch {
        enhanceSelects()
      }
    })

    try {
      enhanceSelects()
    } catch (error) {
      console.warn('Searchable dropdown bootstrap failed:', error)
    }
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'disabled'],
    })

    return () => {
      observer.disconnect()
      for (const [, instance] of instances) {
        try {
          instance.destroy()
        } catch {
          // no-op
        }
      }
      instances.clear()
    }
  }, [])

  return null
}
