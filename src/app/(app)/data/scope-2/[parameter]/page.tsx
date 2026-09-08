import {DataPage} from '@/components/data-page';
export default async function Page({params}:{params:Promise<{parameter:string}>}){const {parameter}=await params;return <DataPage slug={parameter}/>}
