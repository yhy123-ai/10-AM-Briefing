import {HomeView} from '@/components/home-view';
import {getEdition,listDates} from '@/lib/repository';
export default async function Home({searchParams}:{searchParams:Promise<{date?:string}>}){const{date}=await searchParams;const[edition,dates]=await Promise.all([getEdition(date),listDates()]);return <HomeView edition={edition} dates={dates}/>}
