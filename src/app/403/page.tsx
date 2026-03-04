import { useNavigate } from 'react-router-dom'

export default function ForbiddenPage() {
	const navigate = useNavigate()

	return (
		<div className='flex flex-col items-center justify-center min-h-[calc(100vh-80px)] gap-6 text-center px-4'>
			<h1 className='text-6xl font-bold text-gray-300'>403</h1>
			<h2 className='text-2xl font-semibold text-gray-200'>Access Denied</h2>
			<p className='text-gray-400 max-w-md'>
				You don't have permission to access this resource. This project may have
				been deleted or you may not have the required access.
			</p>
			<button
				onClick={() => navigate('/')}
				className='px-6 py-2 bg-white text-black font-medium rounded hover:bg-gray-200 transition-colors'
			>
				Back to Dashboard
			</button>
		</div>
	)
}
