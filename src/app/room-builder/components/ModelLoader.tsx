import { fetchGetModelsCatalog } from '@/api/model'
import { QUERY_KEYS } from '@/constants/query-keys'
import { getModelPath } from '@/lib/utils'
import { useGLTF } from '@react-three/drei'
import { useQuery } from '@tanstack/react-query'

export function PreloadAllModels() {
	const { data } = useQuery({
		queryKey: [QUERY_KEYS.modelCatalog],
		queryFn: fetchGetModelsCatalog,
	})

	data?.forEach(model => {
		useGLTF.preload(getModelPath(model.name))
	})

	return null
}
