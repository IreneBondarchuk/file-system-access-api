import styles from "./page.module.css";
import {Viewer} from "@/app/viewer";

export default function Home() {

  return (
    <main className={styles.main}>
      <div className={styles.grid}>
        <Viewer />
      </div>
    </main>
  );
}