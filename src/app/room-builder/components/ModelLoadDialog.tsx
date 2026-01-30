import { ModelLoader } from '@/components/mode-loader/ModelLoader'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'

interface ModelLoadDialogProps {
	name: string;
}

export const ModelLoadDialog = ({ name }: ModelLoadDialogProps) => {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline'>Load room model</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Load Room Model</DialogTitle>
					<DialogDescription>
						Upload or load a GLB file of your 3D room model. This model will be
						used in the scene.
					</DialogDescription>
				</DialogHeader>
				<ModelLoader name={name} />
				<DialogFooter>
					<Button>Load Model</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
