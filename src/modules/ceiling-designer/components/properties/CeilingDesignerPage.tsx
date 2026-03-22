import { CeilingCanvas } from '../canvas/CeilingCanvas'
import { CeilingToolbar } from '../canvas/CeilingToolbar'
import { CeilingSidebar } from '../sidebar/CeilingSidebar'
import { useNavigate, useMatch } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useCeilingDesignerStore } from '../../store'
import { fetchUpdateProject } from '@/api/project'
import { useState } from 'react'

export function CeilingDesignerPage() {
	const navigate = useNavigate()
	const match = useMatch('/room-builder/edit-room/:id/*')
	const projectId = match?.params?.id
	const components = useCeilingDesignerStore((s) => s.components)
	const getLayoutSummary = useCeilingDesignerStore((s) => s.getLayoutSummary)
	const [saving, setSaving] = useState(false)

	const handleBack = () => {
		if (projectId) navigate(`/room-builder/edit-room/${projectId}`)
	}

	const handleNext = async () => {
		if (!projectId) return

		// ── DEBUG: Log ONLY the final object that 3D renderer receives ──
		console.log('=== 3D RENDERER FINAL DATA OBJECT ===')
		console.log(JSON.stringify(components, null, 2))
		console.log('=== END 3D DATA ===\n')

		// Save ceiling layout to DB via project update
		if (components.length > 0) {
			try {
				setSaving(true)
				const summary = getLayoutSummary()
				await fetchUpdateProject(Number(projectId), {
					name: '', // will be ignored by PATCH if empty – backend keeps existing
					ceilingLights: {
						components: components.map((c) => ({
							id: c.id,
							type: c.type,
							color: c.color,
							x: c.x,
							y: c.y,
							rotation: c.rotation,
							parentId: c.parentId,
							childIds: c.childIds,
							...(c.ceilingNormal ? { ceilingNormal: c.ceilingNormal } : {}),
							...(c.type === 'light-bar'
								? { length: (c as any).length, lightMode: (c as any).lightMode }
								: {}),
						})),
						summary,
					},
				} as any)
			} catch {
				// silently fail – layout is still in local store & visible in 3D
				console.warn('Failed to save ceiling layout to server')
			} finally {
				setSaving(false)
			}
		}

		// Navigate back to the main 3D view (ceiling lights will render via CeilingLights3D)
		navigate(`/room-builder/edit-room/${projectId}`)
	}

	return (
		<div className='flex h-[calc(100dvh-var(--header-height))] w-full'>
			{/* 2D Canvas area */}
			<div className='relative flex-1 flex flex-col'>
				<CeilingCanvas />
				<CeilingToolbar />
			</div>

			{/* Right sidebar */}
			<div className='flex flex-col'>
				<CeilingSidebar />
				<div className='side-bar-nav-btn p-3'>
					<Button
						variant='outline'
						className='px-8'
						onClick={handleBack}
					>
						Back
					</Button>
					<Button className='px-8' onClick={handleNext} disabled={saving}>
						{saving ? 'Saving...' : 'Next'}
					</Button>
				</div>
			</div>
		</div>
	)
}
