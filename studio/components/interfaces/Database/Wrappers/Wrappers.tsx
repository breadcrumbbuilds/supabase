import Link from 'next/link'
import { useState } from 'react'
import { Button, IconExternalLink } from 'ui'
import { observer } from 'mobx-react-lite'
import * as Tooltip from '@radix-ui/react-tooltip'
import { PermissionAction } from '@supabase/shared-types/out/constants'

import { checkPermissions, useStore } from 'hooks'
import { useFDWsQuery } from 'data/fdw/fdws-query'
import { WRAPPERS } from './Wrappers.constants'
import WrapperRow from './WrapperRow'
import { useProjectContext } from 'components/layouts/ProjectLayout/ProjectContext'

const Wrappers = () => {
  const { ui, meta } = useStore()
  const { project } = useProjectContext()
  const { data, isLoading } = useFDWsQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })
  const enabledWrapperNamesSet = new Set(data?.result.map((fdw) => fdw.name))

  const [open, setOpen] = useState<string>('')
  const [isEnabling, setIsEnabling] = useState<boolean>(false)

  const wrappersExtension = meta.extensions.byId('wrappers')
  const vaultExtension = meta.extensions.byId('supabase_vault')

  const isWrappersEnabled =
    wrappersExtension !== undefined &&
    wrappersExtension?.installed_version !== null &&
    vaultExtension !== undefined &&
    vaultExtension?.installed_version !== null

  const canToggleWrappers = checkPermissions(PermissionAction.TENANT_SQL_ADMIN_WRITE, 'extensions')

  const onEnableWrappers = async () => {
    if (wrappersExtension === undefined || vaultExtension === undefined) return
    setIsEnabling(true)

    const requiredExtensions = await Promise.all([
      await meta.extensions.create({
        schema: wrappersExtension.schema ?? 'extensions',
        name: wrappersExtension.name,
        version: wrappersExtension.default_version,
        cascade: true,
      }),
      await meta.extensions.create({
        schema: vaultExtension.schema ?? 'vault',
        name: vaultExtension.name,
        version: vaultExtension.default_version,
        cascade: true,
      }),
    ])
    const errors = requiredExtensions.filter(
      (res) => res.error && !res.error.message.includes('already exists')
    )

    if (errors.length > 0) {
      ui.setNotification({
        error: errors,
        category: 'error',
        message: `Failed to enable Wrappers for your project: ${errors
          .map((x) => x.message)
          .join(', ')}`,
      })
    } else {
      ui.setNotification({
        category: 'success',
        message: 'Wrappers is now enabled for your project!',
      })
    }

    setIsEnabling(false)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-scale-1200 mb-2 text-xl">Foreign Data Wrappers</h3>
          <div className="text-scale-900 text-sm">
            Query your data warehouse directly from your database, or third-party APIs using SQL.
          </div>
        </div>
        {/* [Joshen TODO] For when we support multiple instances per wrapper */}
        {/* <div>
          <Dropdown
            side="bottom"
            align="end"
            size="small"
            overlay={
              <>
                {WRAPPERS.map((wrapper, idx) => (
                  <>
                    <Dropdown.Item
                      key={wrapper.name}
                      icon={
                        <Image
                          src={wrapper.icon}
                          width={20}
                          height={20}
                          alt={`${wrapper.name} wrapper icon`}
                        />
                      }
                      onClick={() => {}}
                    >
                      {wrapper.label}
                    </Dropdown.Item>
                    {idx !== WRAPPERS.length - 1 && <Dropdown.Separator />}
                  </>
                ))}
              </>
            }
          >
            <Button type="primary">Add wrapper</Button>
          </Dropdown>
        </div> */}
      </div>

      {isWrappersEnabled ? (
        <div>
          {WRAPPERS.map((wrapper) => {
            return (
              <WrapperRow
                wrapper={wrapper}
                isLoading={isLoading}
                isEnabled={enabledWrapperNamesSet.has(wrapper.server.name)}
                isOpen={open === wrapper.name}
                onOpen={(wrapperName) => {
                  if (open !== wrapperName) setOpen(wrapperName)
                  else setOpen('')
                }}
              />
            )
          })}
        </div>
      ) : (
        <div>
          <div
            className="px-12 py-12 w-full bg-white dark:bg-scale-200 border border-scale-500 rounded bg-no-repeat"
            style={{
              backgroundSize: '45%',
              backgroundPosition: '105% 40%',
              backgroundImage: ui.isDarkTheme
                ? 'url("/img/wrappers-dark.png")'
                : 'url("/img/wrappers-light.png")',
            }}
          >
            <div className="w-3/5 space-y-8">
              <div className="space-y-2">
                <h4 className="text-lg">Supabase Wrappers</h4>
                <p className="text-sm text-scale-1100">
                  Supabase Wrappers is a framework for building Postgres Foreign Data Wrappers (FDW)
                  which connect Postgres to external systems. Query your data warehouse or
                  third-party APIs directly from your database
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Link href="https://supabase.com/docs">
                  <a target="_blank">
                    <Button type="default" icon={<IconExternalLink />}>
                      About Wrappers
                    </Button>
                  </a>
                </Link>
                <Tooltip.Root delayDuration={0}>
                  <Tooltip.Trigger>
                    <Button
                      type="primary"
                      loading={isEnabling}
                      disabled={isEnabling || !canToggleWrappers}
                      onClick={() => onEnableWrappers()}
                    >
                      Enable Wrappers
                    </Button>
                  </Tooltip.Trigger>
                  {!canToggleWrappers && (
                    <Tooltip.Content side="bottom">
                      <Tooltip.Arrow className="radix-tooltip-arrow" />
                      <div
                        className={[
                          'rounded bg-scale-100 py-1 px-2 leading-none shadow',
                          'border border-scale-200',
                        ].join(' ')}
                      >
                        <span className="text-xs text-scale-1200">
                          You need additional permissions to enable Wrappers for this project
                        </span>
                      </div>
                    </Tooltip.Content>
                  )}
                </Tooltip.Root>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default observer(Wrappers)
